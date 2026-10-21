const config = require('../config/config');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AppError, AuthenticationError } = require('../errors');
const { TOKEN_EXPIRY_SECONDS } = require('../constants/auth');
const {
    getUserRepository,
    getUserPasswordRepository
} = require('../repositories');

const INVALID_CREDENTIALS = 'Invalid login credentials';

const createLoginService = ({
    userRepository,
    userPasswordRepository,
    jwtSecret = config.auth.jwtSecret
} = {}) => {
    
    if (userRepository !== undefined && (
        typeof userRepository?.findByEmail !== 'function' ||
        typeof userRepository?.findByPhone !== 'function'
    )) {
        throw new TypeError('Login service requires a user repository');
    }
    if (
        userPasswordRepository !== undefined &&
        typeof userPasswordRepository?.findByUserId !== 'function'
    ) {
        throw new TypeError('Login service requires user and password repositories');
    }

    const resolveUserRepository = () => userRepository || getUserRepository();
    const resolveUserPasswordRepository = () =>
        userPasswordRepository || getUserPasswordRepository();

    const findUser = ({ contactType, email, phone }) =>
        contactType === 'email'
            ? resolveUserRepository().findByEmail(email.toLowerCase())
            : resolveUserRepository().findByPhone(phone);

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
            throw new AppError(
                'Authentication requires a JWT secret of at least 32 bytes',
                500
            );
        }

        const user = await findUser(credentials);
        if (!user) {
            throw new AuthenticationError(INVALID_CREDENTIALS);
        }

        await verifyPassword(user.id, credentials.password);

        const token = jwt.sign(
            { sub: String(user.id) },
            jwtSecret,
            { expiresIn: TOKEN_EXPIRY_SECONDS }
        );

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
    };

    return { loginUser };
};

module.exports = createLoginService;
