const path = require('node:path');
const ejs = require('ejs');
const config = require('#src/config/config.js');
const { 
    mysql: { 
        getUserRepository,
        getActiveTokenRepository
    } 
} = require('#src/repositories/index.js');
const createEmailService = require('./email.service');
const { generatePasswordResetToken, verifyJWTtoken } = require('#src/utils/jwt.js');
const { PASSWORD_RESET_PURPOSE } = require('#src/constants/auth.js');
const defaultLogger = require('#src/utils/logger.js');
const requestCoalescer = require('#src/lib/requestCoalescer.js')
const createCoalescingKey = require('#src/lib/createCoalescingKey.js');


const CHANGE_PASSWORD_PATH = '/v1/auth/change-password';
const RESPONSE_MESSAGE = 'If an account exists for this email, a password reset link has been sent.';

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
        const resetUrl = new URL(CHANGE_PASSWORD_PATH, config.app.apiBaseUrl);

        if (!['http:', 'https:'].includes(resetUrl.protocol)) {
            throw new Error('API_BASE_URL must be a valid HTTP(S) URL');
        }

        resetUrl.searchParams.set('token', token);
        return resetUrl.toString();
    };

    const forgotPassword = async ({ email }, signal, logger = defaultLogger) => {
        logger.debug('Password reset request started');
        const normalizedEmail = email.trim().toLowerCase();
        const repository = userRepository || getUserRepository();
        const user = await requestCoalescer(
            createCoalescingKey({
                db: "mysql",
                repository: "userRepository",
                method: "findByEmail",
                args: [normalizedEmail]
            }),
            () => repository.findByEmail(normalizedEmail),
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
        const ttlSeconds = config.auth.jwt.jwtPasswordResetTokenTtlSeconds;
        const tokenExpiry = `${Math.round(ttlSeconds / 60)} minutes`;
        const name = user.firstName || 'there';
        const html = await ejs.renderFile(
            path.join(process.cwd(), 'src/views/emailTemplates/forgotPassword.ejs'),
            { name, resetUrl, tokenExpiry }
        );

        const tokens = activeTokenRepository || getActiveTokenRepository();
        await tokens.create({
            tokenType: PASSWORD_RESET_PURPOSE,
            jti: payload.jti,
            userId: user.id,
            expiresAt: new Date(payload.exp * 1000)
        });

        await getEmailService().sendEmail(
            {
                to: user.email,
                subject: 'Reset your password',
                text: [
                    `Hello ${name},`,
                    '',
                    'Reset your password by opening this link:',
                    resetUrl,
                    '',
                    `This link expires in ${tokenExpiry}. If you did not request this, you can ignore this email.`
                ].join('\n'),
                html
            },
            signal,
            logger
        );

        return { success: true, message: RESPONSE_MESSAGE };
    };

    return { forgotPassword };
};


module.exports = createForgotPasswordService;