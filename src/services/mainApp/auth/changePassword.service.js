const config = require('#src/config/config/index.js');
const {
    AuthenticationError
} = require('#src/errors/index.js');
const {
    mysql: {
        getUserRepository,
        getUserPasswordRepository,
        getActiveTokenRepository
    }
} = require('#src/repositories/index.js');
const { hashPassword } = require('#src/utils/hashPasswordAndVerify.js');
const { verifyJWTtoken } = require('#src/utils/jwt.js');
const defaultLogger = require('#src/utils/logger.js');
const { PASSWORD_RESET_PURPOSE } = require('#src/constants/auth.js');
const { 
    dbs: { 
        mysql: { 
            sequelize
        } 
    } 
} = require('#src/infrastructure/database/index.js');


const INVALID_RESET_LINK_MESSAGE = 'Invalid or expired password reset link';
const SUCCESS_MESSAGE = 'Password has been changed successfully.';

const createChangePasswordService = ({
    userRepository,
    userPasswordRepository,
    activeTokenRepository,
    mysqlSequelizeClient
} = {}) => {
    if (
        userRepository !== undefined &&
        typeof userRepository?.findById !== 'function'
    ) {
        throw new TypeError('Change password service requires a user repository');
    }

    if (
        userPasswordRepository !== undefined &&
        typeof userPasswordRepository?.updateByUserId !== 'function'
    ) {
        throw new TypeError('Change password service requires a user password repository');
    }

    if (
        mysqlSequelizeClient !== undefined &&
        typeof mysqlSequelizeClient?.transaction !== 'function'
    ) {
        throw new TypeError('Change password service requires a MySQL transaction client');
    }

    if (
        activeTokenRepository !== undefined &&
        typeof activeTokenRepository?.consume !== 'function'
    ) {
        throw new TypeError('Change password service requires an active token repository');
    }

    const verifyResetToken = (token) => {
        const secret = config.auth.jwt.jwtPasswordResetTokenSecret;

        if (!secret || Buffer.byteLength(secret) < 32) {
            throw new Error('Password reset requires a JWT secret of at least 32 bytes');
        }

        let payload;
        try {
            payload = verifyJWTtoken({ token, secret });
        } catch (error) {
            if (
                ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError']
                    .includes(error.name)
            ) {
                throw new AuthenticationError(INVALID_RESET_LINK_MESSAGE);
            }

            throw error;
        }

        if (
            !payload ||
            typeof payload !== 'object' ||
            payload.purpose !== PASSWORD_RESET_PURPOSE ||
            typeof payload.sub !== 'string' ||
            payload.sub.length === 0 ||
            typeof payload.email !== 'string' ||
            payload.email.length === 0 ||
            typeof payload.jti !== 'string' ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.jti) ||
            !Number.isSafeInteger(payload.exp)
        ) {
            throw new AuthenticationError(INVALID_RESET_LINK_MESSAGE);
        }

        return payload;
    };

    const changePassword = async (
        { 
            token, 
            newPassword 
        },
        logger = defaultLogger
    ) => {
        logger.debug('Password reset started');
        const payload = verifyResetToken(token);
        const users = userRepository || getUserRepository();
        const passwords = userPasswordRepository || getUserPasswordRepository();
        const tokens = activeTokenRepository || getActiveTokenRepository();
        const passwordHash = await hashPassword(newPassword);
        sequelize = mysqlSequelizeClient || sequelize;

        await sequelize.transaction(async (transaction) => {
            const user = await users.findById(payload.sub, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!user || user.email !== payload.email) {
                throw new AuthenticationError(INVALID_RESET_LINK_MESSAGE);
            }

            const consumedRows = await tokens.consume(
                {
                    tokenType: PASSWORD_RESET_PURPOSE,
                    jti: payload.jti,
                    userId: user.id
                }, 
                { 
                    transaction 
                }
            );

            if (consumedRows !== 1) {
                throw new AuthenticationError(INVALID_RESET_LINK_MESSAGE);
            }

            const [updatedRows] = await passwords.updateByUserId(
                user.id,
                { 
                    passwordHash 
                },
                { 
                    transaction 
                }
            );

            if (!Number.isInteger(updatedRows) || updatedRows < 1) {
                throw new AuthenticationError(INVALID_RESET_LINK_MESSAGE);
            }
        });

        logger.debug('Password reset completed', { userId: payload.sub });
        return { 
            success: true, 
            message: SUCCESS_MESSAGE 
        };
    };

    return { changePassword };
};


module.exports = createChangePasswordService;