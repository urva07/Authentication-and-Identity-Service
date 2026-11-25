const config = require('#src/config/config/index.js');
const { 
    mysql: { 
        getUserRepository,
        getActiveTokenRepository
    } 
} = require('#src/repositories/index.js');
const createEmailService = require('./email.service');
const { generatePasswordResetToken, verifyJWTtoken } = require('#src/utils/jwt.js');
const {
    AUTH_ROUTES,
    PASSWORD_RESET_PURPOSE,
    EMAIL_SUBJECTS,
    AUTH_MESSAGES,
    COALESCING,
    EMAIL_TEMPLATES
} = require('#src/constants/index.js');
const defaultLogger = require('#src/utils/logger.js');
const requestCoalescer = require('#src/lib/requestCoalescer.js')
const { createCoalescingKey } = require('#src/lib/index.js');


const RESPONSE_MESSAGE = AUTH_MESSAGES.PASSWORD_RESET_REQUEST_SENT;

const createForgotPasswordService = ({
    userRepository,
    activeTokenRepository,
    emailService
} = {}) => {
    if (
        userRepository !== undefined &&
        typeof userRepository?.findByEmail !== 'function'
    ) {
        throw new TypeError('Forgot password service requires a user repository');
    }

    if (
        emailService !== undefined &&
        typeof emailService?.sendEmail !== 'function'
    ) {
        throw new TypeError('Forgot password service requires an email service');
    }

    if (
        activeTokenRepository !== undefined &&
        typeof activeTokenRepository?.create !== 'function'
    ) {
        throw new TypeError('Forgot password service requires an active token repository');
    }

    const coalescingKey = createCoalescingKey({
        db: COALESCING.DATABASES.MYSQL,
        repository: COALESCING.MYSQL.REPOSITORIES.USER,
        method: COALESCING.MYSQL.METHODS.USER.FIND_BY_EMAIL
    });

    const ttlSeconds = config.auth.jwt.jwtPasswordResetTokenTtlSeconds;
    const tokenExpiry = `${Math.round(ttlSeconds / 60)} minutes`;

    let productionEmailService;

    const getEmailService = () => {
        if (emailService) {
            return emailService;
        }

        productionEmailService ||= createEmailService();
        return productionEmailService;
    };

    const createResetToken = (user) => {

        return generatePasswordResetToken({
            userId: user.id,
            email: user.email,
            purpose: PASSWORD_RESET_PURPOSE
        });
    };

    const createResetUrl = (token) => {
        const resetUrl = new URL(AUTH_ROUTES.CHANGE_PASSWORD, config.apps.mainApp.apiBaseUrl);

        if (!['http:', 'https:'].includes(resetUrl.protocol)) {
            throw new Error('API_BASE_URL must be a valid HTTP(S) URL');
        }

        resetUrl.searchParams.set('token', token);
        return resetUrl.toString();
    };

    const forgotPassword = async ({ email }, signal, logger = defaultLogger) => {
        logger.debug('Password reset request started');
        userRepository = userRepository || getUserRepository();
        activeTokenRepository = activeTokenRepository || getActiveTokenRepository();
        const normalizedEmail = email.trim().toLowerCase();
        const user = await requestCoalescer(
            coalescingKey([normalizedEmail]),
            () => userRepository.findByEmail(normalizedEmail),
            logger
        );

        // Same response for unknown emails so the endpoint cannot be used to discover accounts.
        if (!user) {
            logger.debug('Password reset requested for an unknown email');
            return { success: true, message: RESPONSE_MESSAGE };
        }

        const token = createResetToken(user);
        const payload = verifyJWTtoken({
            token,
            secret: config.auth.jwt.jwtPasswordResetTokenSecret
        });
        const resetUrl = createResetUrl(token);
        const name = user.firstName || 'there';

        await activeTokenRepository.create({
            tokenType: PASSWORD_RESET_PURPOSE,
            jti: payload.jti,
            userId: user.id,
            expiresAt: new Date(payload.exp * 1000)
        });

        await getEmailService().sendEmail(
            {
                to: user.email,
                subject: EMAIL_SUBJECTS.RESET_PASSWORD,
                template: EMAIL_TEMPLATES.FORGOT_PASSWORD,
                templateData: {
                    name,
                    resetUrl,
                    tokenExpiry
                }
            },
            signal,
            logger
        );

        return { success: true, message: RESPONSE_MESSAGE };
    };

    return { forgotPassword };
};


module.exports = createForgotPasswordService;