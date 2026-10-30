const config = require('../../../config/config');
const bcrypt = require('bcryptjs');
const logger = require('#src/utils/logger.js');
const { AuthenticationError } = require('../../../errors');
const {
    getUserRepository,
    getUserPasswordRepository
} = require('../../../repositories');
const { generateRefreshToken, generateAccessToken } = require('#src/utils/jwt.js');

const INVALID_CREDENTIALS = 'Invalid login credentials';

const createLoginService = ({
    userRepository,
    userPasswordRepository,
    jwtSecret = config.auth.jwt.jwtAccessTokenSecret
} = {}) => {
    if (
        userRepository !== undefined && 
        (
            typeof userRepository?.findByEmail !== 'function' ||
            typeof userRepository?.findByPhone !== 'function'
        )
    ) {
        throw new TypeError('Login service requires a user repository');
    }

    if (
        userPasswordRepository !== undefined &&
        typeof userPasswordRepository?.findByUserId !== 'function'
    ) {
        throw new TypeError('Login service requires user and password repositories');
    }

    const resolveUserRepository = () => userRepository || getUserRepository();
    
    const resolveUserPasswordRepository = () => {
        return userPasswordRepository || getUserPasswordRepository();
    };

    const findUser = ({ contactType, email, phone }) => {
        logger.debug('Looking up login user', { contactType });
        return contactType === 'email'
            ? resolveUserRepository().findByEmail(email.toLowerCase())
            : resolveUserRepository().findByPhone(phone);
    };

    const verifyPassword = async (userId, password) => {
        logger.debug('Verifying login password', { userId: String(userId) });
        const passwordCredential = await resolveUserPasswordRepository().findByUserId(userId);

        if (
            !passwordCredential ||
            !(await bcrypt.compare(password, passwordCredential.passwordHash))
        ) {
            logger.debug('Login password verification failed', { userId: String(userId) });
            throw new AuthenticationError(INVALID_CREDENTIALS);
        }

        logger.debug('Login password verification succeeded', { userId: String(userId) });
    };

    const loginUser = async (credentials) => {
        logger.debug('Login attempt started', { contactType: credentials.contactType });
        if (!jwtSecret || Buffer.byteLength(jwtSecret) < 32) {
            throw new Error('Authentication requires a JWT secret of at least 32 bytes');
        }

        const user = await findUser(credentials);
        
        if (!user) {
            logger.debug('Login user lookup failed');
            throw new AuthenticationError(INVALID_CREDENTIALS);
        }

        logger.debug('Login user found, verifying password', { userId: String(user.id) });
        await verifyPassword(user.id, credentials.password);

        try {
            const accessToken = generateAccessToken(user.id);
            const refreshToken = generateRefreshToken(user.id);

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
