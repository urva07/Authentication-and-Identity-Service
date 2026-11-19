const bcrypt = require('bcryptjs');
const defaultLogger = require('#src/utils/logger.js');
const { AuthenticationError } = require('#src/errors/index.js');
const {
    mysql: {
        getUserRepository,
        getUserPasswordRepository
    },
    redis: {
        userCacheInstance: {
            getUserExistenceRepository
        },
        sessionInstance: {
            getUserLockRepository
        }
    }
} = require('#src/repositories/index.js');
const { generateRefreshToken, generateAccessToken } = require('#src/utils/jwt.js');
const requestCoalescer = require('#src/lib/requestCoalescer.js');
const { createCoalescingKey, cacheAuthenticatedUser } = require('#src/lib/index.js');


const INVALID_CREDENTIALS = 'Invalid login credentials';

const createLoginService = ({
    userRepository,
    userPasswordRepository,
    userExistenceRepository,
    userLockRepository
} = {}) => {
    if (
        userRepository !== undefined && 
        typeof userRepository?.findByEmail !== 'function'
    ) {
        throw new TypeError('Login service requires a user repository');
    }

    if (
        userPasswordRepository !== undefined &&
        typeof userPasswordRepository?.findByUserId !== 'function'
    ) {
        throw new TypeError('Login service requires user and password repositories');
    }

    const userRepoCoalescingKey = createCoalescingKey({
        db: 'mysql',
        repository: 'userRepository',
        method: 'findByEmail'
    });

    const userPasswordRepoCoalescingKey = createCoalescingKey({
        db: 'mysql',
        repository: 'userPasswordRepository',
        method: 'findByUserId'
    });

    const findUser = (email, logger) => {
        logger.debug('Looking up login user by email');
        userRepository = userRepository || getUserRepository();
        const normalizedEmail = email.trim().toLowerCase();

        return requestCoalescer(
            userRepoCoalescingKey([normalizedEmail]),
            () => userRepository.findByEmail(normalizedEmail),
            logger
        );
    };

    const verifyPassword = async (userId, password, logger) => {
        logger.debug('Verifying login password', { userId: String(userId) });
        userPasswordRepository = userPasswordRepository || getUserPasswordRepository();
        const args = [userId];
        const passwordCredential = await requestCoalescer(
            userPasswordRepoCoalescingKey(args),
            () => userPasswordRepository.findByUserId(...args),
            logger
        );

        if (
            !passwordCredential ||
            !(await bcrypt.compare(password, passwordCredential.passwordHash))
        ) {
            logger.debug('Login password verification failed', { userId: String(userId) });
            throw new AuthenticationError(INVALID_CREDENTIALS);
        }

        logger.debug('Login password verification succeeded', { userId: String(userId) });
    };

    const loginUser = async (credentials, logger = defaultLogger) => {
        logger.debug('Login attempt started');

        if (typeof credentials?.email !== 'string') {
            throw new AuthenticationError(INVALID_CREDENTIALS);
        }

        const user = await findUser(credentials.email, logger);
        
        if (!user) {
            logger.debug('Login user lookup failed');
            throw new AuthenticationError(INVALID_CREDENTIALS);
        }

        logger.debug('Login user found, verifying password', { userId: String(user.id) });
        await verifyPassword(user.id, credentials.password, logger);

        try {
            const accessToken = generateAccessToken(user.id);
            const refreshToken = generateRefreshToken(user.id);
            userExistenceRepository = userExistenceRepository || getUserExistenceRepository();
            userLockRepository = userLockRepository || getUserLockRepository();

            await cacheAuthenticatedUser(
                {
                    userExistenceRepository,
                    userLockRepository
                },
                user.id,
                logger
            )

            return {
                accessToken,
                refreshToken,
                user: {
                    id: String(user.id),
                    email: user.email,
                    phone: user.phone,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    profilePhoto: user.profilePhoto,
                    profileCompleted: user.profileCompleted
                }
            };
        } catch (error) {
            logger.debug('Login token generation failed', { userId: String(user.id) });
            throw new Error('Failed to generate JWT token', error);
        }
    };

    return { loginUser };
};


module.exports = createLoginService;
