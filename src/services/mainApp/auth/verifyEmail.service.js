const config = require('#src/config/config/index.js');
const { ValidationError } = require('#src/errors/index.js');
const { generateAccessToken, generateRefreshToken } = require('#src/utils/jwt.js');
const { 
    mysql: { 
        getUserRepository, 
        getUserPasswordRepository 
    } 
} = require('#src/repositories/index.js');
const { verifyAes256GcmTokenWithExpiry } = require('#src/utils/aes256GcmToken.js');
const { createSigninTokenKey } = require('#src/utils/signinTokenKey.js');
let { 
    dbs: { 
        mysql: { 
            sequelize
        } 
    } 
} = require('#src/infrastructure/database/index.js');
const defaultLogger = require('#src/utils/logger.js');
const requestCoalescer = require('#src/lib/requestCoalescer.js')
const createCoalescingKey = require('#src/lib/createCoalescingKey.js');


const INVALID_LINK_MESSAGE = 'Invalid or expired verification link';
const NAME_MAX_LENGTH = 100;

const createVerifyEmailService = ({
    userRepository,
    userPasswordRepository,
    mysqlSequelizeClient
} = {}) => {
    if (
        userRepository !== undefined &&
        (
            typeof userRepository?.findById !== 'function' ||
            typeof userRepository?.create !== 'function'
        )
    ) {
        throw new TypeError('Verify email service requires a user repository');
    }

    if (
        userPasswordRepository !== undefined &&
        typeof userPasswordRepository?.create !== 'function'
    ) {
        throw new TypeError('Verify email service requires a user password repository');
    }

    sequelize = mysqlSequelizeClient || sequelize;
    const encryptionKey = createSigninTokenKey(config.auth.basic.signinAes256GcmTokenSecret);

    const coalescingKey = createCoalescingKey({
        db: "mysql",
        repository: "userRepository",
        method: "findById"
    });

    const decodeToken = (token) => {
        const payload = verifyAes256GcmTokenWithExpiry(token, encryptionKey);
        if (!payload) {
            throw new ValidationError(INVALID_LINK_MESSAGE);
        }

        return payload;
    };

    const splitName = (name) => {
        const [firstName, ...rest] = name.trim().split(/\s+/);

        return {
            firstName: firstName.slice(0, NAME_MAX_LENGTH),
            lastName: rest.join(' ').slice(0, NAME_MAX_LENGTH) || null
        };
    };

    const verifyEmail = async (token, logger = defaultLogger) => {
        logger.debug('Email verification started');
        const { email, passwordHash, name, sub } = decodeToken(token);

        userRepository = userRepository || getUserRepository();
        userPasswordRepository = userPasswordRepository || getUserPasswordRepository();
         const existingUser = await requestCoalescer(
            coalescingKey([sub]),
            () => userRepository.findById(sub),
            logger
        );

        if (existingUser) {
            if (existingUser.email === email) {
                logger.debug('A reuse of valid token is detected.');

                return {
                    conflict: true,
                    response: {
                        success: true,
                        message: 'An account with this ID already exists.'
                    }
                }
            }

            logger.debug('A reuse of valid token is detected with an old email.');
            throw new ValidationError(INVALID_LINK_MESSAGE);
        }

        const { firstName, lastName } = splitName(name);

        try {
            await sequelize.transaction(async (transaction) => {
                const createdUser = await userRepository.create(
                    { 
                        id: sub, 
                        email, 
                        firstName, 
                        lastName 
                    },
                    { 
                        transaction 
                    }
                );

                await userPasswordRepository.create(
                    { 
                        userId: sub, 
                        passwordHash 
                    },
                    { 
                        transaction 
                    }
                );

                return createdUser;
            });

            const accessToken = generateAccessToken(sub);

            const refreshToken = generateRefreshToken(sub);

            logger.debug('Email verification completed', { userId: sub });

            return {
                conflict: false,
                response: {
                    success: true,
                    message: 'Email verification successful.'
                },
                accessToken,
                refreshToken
            };
        } catch (error) {
            if (error?.name === 'SequelizeUniqueConstraintError') {
                logger.debug('A conflict of user has been encountered after verifying the user doesnot exist while creating it during database transaction.')

                return {
                    conflict: true,
                    response: {
                        success: false,
                        message: 'An account with this ID already exists.'
                    }
                };
            }

            throw error;
        }
    };

    return { verifyEmail };
};


module.exports = createVerifyEmailService;
