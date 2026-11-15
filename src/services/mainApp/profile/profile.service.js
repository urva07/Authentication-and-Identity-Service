const { AuthenticationError, NotFoundError } = require('#src/errors/index.js');
const { 
    mysql: { 
        getUserRepository 
    } 
} = require('#src/repositories/index.js');
const requestCoalescer = require('#src/lib/requestCoalescer.js');
const createCoalescingKey = require('#src/lib/createCoalescingKey.js');
const defaultLogger = require('#src/utils/logger.js');


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
    userRepository 
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
        db: "mysql",
        repository: "userRepository",
        method: "findById"
    });

    const findProfileById = (profileId, repository, logger = defaultLogger) => {
        repository = userRepository || getUserRepository();
        return requestCoalescer(
            coalescingKey([profileId]),
            () => repository.findById(profileId),
            logger
        );
    };

    const getMyProfile = async (user, logger = defaultLogger) => {
        if (!user) {
            logger.debug('Profile requested without an authenticated user');
            throw new AuthenticationError('Invalid token');
        }

        const foundUser = await findProfileById(user.id, userRepository, logger);
        if (!foundUser) {
            logger.debug('Requested profile was not found');
            throw new NotFoundError('User not found');
        }

        return toPrivateProfile(foundUser);
    };

    const updateMyProfile = async (user, attributes, logger = defaultLogger) => {
        if (!user) {
            logger.debug('Profile update requested without an authenticated user');
            throw new AuthenticationError('Invalid token');
        }

        userRepository = userRepository || getUserRepository();
        await userRepository.updateById(user.id, attributes);
        const updatedUser = await findProfileById(user.id, userRepository, logger);

        if (!updatedUser) {
            logger.debug('Profile update failed because the user no longer exists');
            throw new NotFoundError('User not found');
        }

        logger.debug('Profile updated');
        return toPrivateProfile(updatedUser);
    };

    const getProfileById = async (requester, id, logger = defaultLogger) => {
        if (!requester) {
            logger.debug('Profile requested without an authenticated user');
            throw new AuthenticationError('Invalid token');
        }

        const user = await findProfileById(id, userRepository, logger);

        if (!user) {
            logger.debug('Requested profile was not found');
            throw new NotFoundError('User not found');
        }

        return String(requester.id).toLowerCase() === String(user.id).toLowerCase()
            ? toPrivateProfile(user)
            : toPublicProfile(user);
    };

    return { 
        getMyProfile, 
        updateMyProfile, 
        getProfileById 
    };
};


module.exports = createProfileService;