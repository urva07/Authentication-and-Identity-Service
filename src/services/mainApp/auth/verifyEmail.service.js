const config = require('../../../config/config');
const { AppError, ConflictError } = require('../../../errors');
const { generateAccessToken, generateRefreshToken } = require('#src/utils/jwt.js');
const {
    getUserRepository,
    getUserPasswordRepository
} = require('../../../repositories');
const { verifyAes256GcmToken } = require('#src/utils/aes256GcmToken.js');
const { createSigninTokenKey } = require('#src/utils/signinTokenKey.js');

const INVALID_LINK_MESSAGE = 'Invalid or expired verification link';
const NAME_MAX_LENGTH = 100;

const createVerifyEmailService = ({
    userRepository,
    userPasswordRepository,
    sequelize
} = {}) => {
    if (
        userRepository !== undefined &&
        (
            typeof userRepository?.findByEmail !== 'function' ||
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

    const decodeToken = (token) => {
        const encryptionKey = createSigninTokenKey(
            config.auth.basic.signinAes256GcmTokenSecret
        );

        let payload;
        try {
            payload = verifyAes256GcmToken(token, encryptionKey);
        } catch (error) {
            throw new AppError(INVALID_LINK_MESSAGE, 400);
        }

        const hasValidShape =
            typeof payload?.email === 'string' &&
            typeof payload?.passwordHash === 'string' &&
            typeof payload?.name === 'string' &&
            Number.isFinite(payload?.exp);

        if (!hasValidShape || payload.exp <= Math.floor(Date.now() / 1000)) {
            throw new AppError(INVALID_LINK_MESSAGE, 400);
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

    const verifyEmail = async (token) => {
        const { email, passwordHash, name } = decodeToken(token);
        const users = userRepository || getUserRepository();
        const passwords = userPasswordRepository || getUserPasswordRepository();

        if (await users.findByEmail(email)) {
            throw new ConflictError('An account with this email already exists');
        }

        const connection = sequelize || config.runtime.db_connections.mysql;
        const { firstName, lastName } = splitName(name);

        try {
            const user = await connection.transaction(async (transaction) => {
                const createdUser = await users.create(
                    { email, firstName, lastName },
                    { transaction }
                );

                await passwords.create(
                    { userId: createdUser.id, passwordHash },
                    { transaction }
                );

                return createdUser;
            });

            const accessToken = generateAccessToken(user.id);
            
            const refreshToken = generateRefreshToken(user.id);

            return {
                id: String(user.id),
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                accessToken,
                refreshToken
            };
        } catch (error) {
            if (error?.name === 'SequelizeUniqueConstraintError') {
                throw new ConflictError('An account with this email already exists');
            }

            throw error;
        }
    };

    return { verifyEmail };
};

module.exports = createVerifyEmailService;
