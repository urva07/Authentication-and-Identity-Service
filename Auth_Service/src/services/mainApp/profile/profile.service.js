const { 
    AuthenticationError, 
    ConflictError,
    NotFoundError 
} = require('#src/errors/index.js');
const { 
    mysql: { 
        getUserRepository 
    },
    redis: {
        userCacheInstance: {
            getprofileCacheRepository
        },
        sessionInstance: {
            getUserLockRepository
        }
    } 
} = require('#src/repositories/index.js');
const requestCoalescer = require('#src/lib/requestCoalescer.js');
const { createCoalescingKey } = require('#src/lib/index.js');
const defaultLogger = require('#src/utils/logger.js');
const { generateUUID } = require('#src/utils/userIdGenerator.js');
const { retryWithExponentialBackoff } = require('#src/lib/index.js');
const { COALESCING } = require('#src/constants/index.js');


const toDateOnly = (value) => {
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }

    return value ?? null;
};

const toPrivateProfile = (user) => ({
    id: user.id,
    email: user.email ?? null,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    phone: user.phone ?? null,
    dateOfBirth: toDateOnly(user.dateOfBirth),
    gender: user.gender ?? null,
    profilePhoto: user.profilePhoto ?? null,
    profileCompleted: Boolean(user.profileCompleted),
    createdAt: user.createdAt ?? null,
    updatedAt: user.updatedAt ?? null
});

// Only non-sensitive fields are exposed when viewing someone else's profile.
const toPublicProfile = (user) => ({
    id: user.id,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    profilePhoto: user.profilePhoto ?? null
});

const createProfileService = ({ 
    userRepository,
    profileCacheRepository,
    userLockRepository
} = {}) => {
    if (
        userRepository !== undefined &&
        (
            typeof userRepository?.findById !== 'function' ||
            typeof userRepository?.updateById !== 'function'
        )
    ) {
        throw new TypeError('Profile service requires a user repository');
    }

    const coalescingKey = createCoalescingKey({
        db: COALESCING.DATABASES.MYSQL,
        repository: COALESCING.MYSQL.REPOSITORIES.USER,
        method: COALESCING.MYSQL.METHODS.USER.FIND_BY_ID
    });

    const findProfileById = (profileId, logger = defaultLogger) => {
        userRepository = userRepository || getUserRepository();
        profileCacheRepository = profileCacheRepository || getprofileCacheRepository();
        userLockRepository = userLockRepository || getUserLockRepository();

        const fetchProfile = async () => {
            logger.debug({ profileId }, 'Fetching profile from cache');

            let cachedProfile;
            try {
                cachedProfile = await profileCacheRepository.getById(profileId);
            } catch (error) {
                logger.error({ profileId, err: error }, 'Failed to fetch profile from cache');
            }

            if (cachedProfile) {
                logger.debug({ profileId }, 'Cache hit for profile');
                return cachedProfile;
            }
            logger.debug({ profileId }, 'Cache miss for profile');

            logger.debug({ profileId }, 'Fetching profile from database');
            const profile = await userRepository.findById(profileId);

            if (profile) {
                logger.debug({ profileId, profile }, 'Profile fetched from database');
                
                const cacheProfile = async () => {
                    const token = generateUUID();

                    try {
                        if (!await userLockRepository.acquire(profileId, token)) {
                            logger.debug({ profileId }, 'Skipping profile cache because profile is locked to cache');
                            return;
                        }
                    } catch (error) {
                        logger.error({ profileId, err: error }, 'Failed to check profile lock; skipping cache');
                        return;
                    }

                    logger.debug({ profileId }, 'Caching profile');
                    try {
                        await profileCacheRepository.setById(profileId, profile);
                        logger.debug({ profileId }, 'Profile cached');
                    } catch (error) {
                        logger.error({ profileId, err: error }, 'Failed to cache profile');
                    } finally {
                        const releaseLock = async () => {
                            await userLockRepository.release(profileId, token);
                            logger.debug({ userId: profileId }, 'Lock released on user');
                        };

                        try {
                            await retryWithExponentialBackoff(releaseLock, 5);
                        } catch (error) {
                            logger.error({ userId: profileId, err: error }, 'Failed to release user lock');
                        }
                    }
                };
                await cacheProfile();

                return profile;
            }

            logger.debug({ profileId }, 'Profile not found from database');
            return null;
        };

        return requestCoalescer(
            coalescingKey([profileId]),
            fetchProfile,
            logger
        );
    };

    const getMyProfile = async (user, logger = defaultLogger) => {
        if (!user) {
            logger.fatal('Profile requested without an authenticated user');
            throw new AuthenticationError('Invalid token');
        }

        const foundUser = await findProfileById(user.id, logger);
        if (!foundUser) {
            throw new NotFoundError('User not found');
        }

        return toPrivateProfile(foundUser);
    };

    const updateMyProfile = async (user, attributes, logger = defaultLogger) => {
        if (!user) {
            logger.fatal('Profile update requested without an authenticated user');
            throw new AuthenticationError('Invalid token');
        }

        userRepository = userRepository || getUserRepository();
        profileCacheRepository = profileCacheRepository || getprofileCacheRepository();
        userLockRepository = userLockRepository || getUserLockRepository();

        const token = generateUUID();
        
        try {
            const lockAcquired = await userLockRepository.acquire(user.id, token);
            
            if (!lockAcquired) {
                logger.debug({ userId: user.id }, 'Profile is currently being modified by another request');
                throw new ConflictError('Profile is locked - another update is in progress');
            }
            logger.debug({ userId: user.id }, 'Profile update lock acquired');
                
            await profileCacheRepository.invalidateById(user.id);
            logger.debug({ userId: user.id }, 'Profile cache invalidated');
            
            await userRepository.updateById(user.id, attributes);
            logger.debug({ userId: user.id }, 'Profile updated in database');
            
            const updatedUser = await findProfileById(user.id, logger);
            
            if (!updatedUser) {
                logger.debug({ userId: user.id }, 'Profile update failed - user no longer exists');
                throw new NotFoundError('User not found');
            }

            logger.debug({ userId: user.id }, 'Profile update completed successfully');
            return toPrivateProfile(updatedUser);

        } finally {
            const releaseLock = async () => {
                await userLockRepository.release(user.id, token);
                logger.debug({ userId: user.id }, 'Profile update lock released');
            };

            try {
                await retryWithExponentialBackoff(releaseLock, 5);
            } catch (error) {
                logger.error({ userId: user.id, err: error }, 'Failed to release profile update lock');
            }
        }
    };

    const getProfileById = async (requester, id, logger = defaultLogger) => {
        if (!requester) {
            logger.fatal('Profile requested without an authenticated user');
            throw new AuthenticationError('Invalid token');
        }

        const user = await findProfileById(id, logger);

        if (!user) {
            logger.debug('Requested profile was not found');
            throw new NotFoundError('User not found');
        }

        return String(requester.id).toLowerCase() === String(user.id).toLowerCase()
            ? toPrivateProfile(user)
            : toPublicProfile(user);
    };

    const deleteMyProfile = async (user, logger = defaultLogger) => {
        if (!user) {
            logger.fatal('Delete profile requested without an authenticated user');
            throw new AuthenticationError('Invalid token');
        }

        userRepository = userRepository || getUserRepository();
        profileCacheRepository = profileCacheRepository || getprofileCacheRepository();
        userLockRepository = userLockRepository || getUserLockRepository();

        const token = generateUUID();

        try {
            const lockAcquired = await userLockRepository.acquire(user.id, token);
            
            if (!lockAcquired) {
                logger.debug({ userId: user.id }, 'Profile is currently being modified by another request');
                throw new ConflictError('Profile is locked - another update or delete operation is in progress');
            }
            logger.debug({ userId: user.id }, 'Profile delete lock acquired');

            await profileCacheRepository.invalidateById(user.id);
            logger.debug({ userId: user.id }, 'Profile cache invalidated');

            await userRepository.deleteById(user.id);
            logger.debug({ userId: user.id }, 'Profile deleted from database');

            try {
                await profileCacheRepository.invalidateById(user.id);
            } catch (error) {
                logger.error({ userId: user.id, err: error }, 'Failed to invalidate profile cache after deletion');
            }

            logger.debug({ userId: user.id }, 'Profile delete operation completed');
            return { 
                success: true 
            };
            
        } finally {
            const releaseLock = async () => {
                await userLockRepository.release(user.id, token);
                logger.debug({ userId: user.id }, 'Profile delete lock released');
            };

            try {
                await retryWithExponentialBackoff(releaseLock, 5);
            } catch (error) {
                logger.error({ userId: user.id, err: error }, 'Failed to release profile delete lock');
            }
        }
    };

    return { 
        getMyProfile, 
        updateMyProfile, 
        getProfileById,
        deleteMyProfile
    };
};


module.exports = createProfileService;