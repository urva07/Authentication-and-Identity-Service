const config = require('../config/config');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('../errors');
const { TOKEN_EXPIRY_SECONDS } = require('../constants/auth');
const {
    getUserRepository,
    getUserPasswordRepository
} = require('../repositories');
const { generateJWTtoken } = require('#src/utils/jwt.js');

const INVALID_CREDENTIALS = 'Invalid login credentials';

const createLoginService = ({
    userRepository,
    userPasswordRepository,
    jwtSecret = config.auth.jwtSecret
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
        return contactType === 'email'
            ? resolveUserRepository().findByEmail(email.toLowerCase())
            : resolveUserRepository().findByPhone(phone);
    };

    const verifyPassword = async (userId, password) => {
        const passwordCredential = await resolveUserPasswordRepository().findByUserId(userId);

        if (
            !passwordCredential ||
            !(await bcrypt.compare(password, passwordCredential.passwordHash))
        ) {
            throw new AuthenticationError(INVALID_CREDENTIALS);
        }
    };

    const loginUser = async (credentials) => {
        if (!jwtSecret || Buffer.byteLength(jwtSecret) < 32) {
            throw new Error('Authentication requires a JWT secret of at least 32 bytes');
        }

        const user = await findUser(credentials);
        
        if (!user) {
            throw new AuthenticationError(INVALID_CREDENTIALS);
        }

        await verifyPassword(user.id, credentials.password);

        try {
            const token = generateJWTtoken({ 
                payload: { 
                    sub: String(user.id)
                },
                expiry: config.auth.jwtRefreshTokenExpiration,
                secret: config.auth.jwtRefreshTokenSecret
            });

            return {
                token,
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
            throw new Error('Failed to generate JWT token', error);
        }
    };

    return { loginUser };
};

module.exports = createLoginService;
