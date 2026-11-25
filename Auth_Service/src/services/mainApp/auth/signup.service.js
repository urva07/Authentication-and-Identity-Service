const config = require('#src/config/config/index.js');
const { ConflictError } = require('#src/errors/index.js');
const { mysql: { getUserRepository } } = require('#src/repositories/index.js');
const createEmailService = require('./email.service');
const { hashPassword } = require('#src/utils/hashPasswordAndVerify.js');
const { generateAes256GcmToken } = require('#src/utils/aes256GcmToken.js');
const { createSigninTokenKey } = require('#src/utils/signinTokenKey.js');
const defaultLogger = require('#src/utils/logger.js');
const { generateUUID } = require('#src/utils/userIdGenerator.js');
const requestCoalescer = require('#src/lib/requestCoalescer.js')
const { createCoalescingKey } = require('#src/lib/index.js');
const {
    AUTH_ROUTES,
    EMAIL_SUBJECTS,
    AUTH_MESSAGES,
    COALESCING,
    JWT_CLAIMS,
    EMAIL_TEMPLATES
} = require('#src/constants/index.js');

const createSigninService = ({
    userRepository,
    emailService
} = {}) => {
    if (
        userRepository !== undefined &&
        typeof userRepository?.findByEmail !== 'function'
    ) {
        throw new TypeError('Signin service requires a user repository');
    }
    
    if (
        emailService !== undefined &&
        typeof emailService?.sendEmail !== 'function'
    ) {
        throw new TypeError('Signin service requires an email service');
    }

    let productionEmailService;

    const coalescingKey = createCoalescingKey({
        db: COALESCING.DATABASES.MYSQL,
        repository: COALESCING.MYSQL.REPOSITORIES.USER,
        method: COALESCING.MYSQL.METHODS.USER.FIND_BY_EMAIL
    });

    const createVerificationUrl = (token) => {
        let verificationUrl = new URL(AUTH_ROUTES.VERIFY_EMAIL, config.apps.mainApp.apiBaseUrl);

        if (!['http:', 'https:'].includes(verificationUrl.protocol)) {
            throw new Error('API_BASE_URL must be a valid HTTP(S) URL');
        }

        verificationUrl.searchParams.set('token', token);
        return verificationUrl.toString();
    };

    const getEmailService = () => {
        if (emailService) {
            return emailService;
        }

        productionEmailService ||= createEmailService();
        return productionEmailService;
    };

    const signup = async ({ email, password, name }, signal, logger = defaultLogger) => {
        logger.debug('Sign-in attempt started');
        userRepository = userRepository || getUserRepository();
        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await requestCoalescer(
            coalescingKey([normalizedEmail]),
            () => userRepository.findByEmail(normalizedEmail),
            logger
        );

        if (existingUser) {
            logger.debug('Sign-in attempt with an existing email');
            throw new ConflictError('An account with this email already exists');
        }

        const encryptionKey = createSigninTokenKey(config.auth.basic.signinAes256GcmTokenSecret);
        const passwordHash = await hashPassword(password, config.auth.basic.hashSaltRounds);
        const issuedAt = Math.floor(Date.now() / 1000);
        const tokenTtlSeconds = config.auth.basic.signinAes256GcmTokenTtlSeconds;
        const verificationToken = generateAes256GcmToken(
            {
                email: normalizedEmail,
                passwordHash,
                name,
                [JWT_CLAIMS.SUBJECT]: generateUUID(),
                iat: issuedAt,
                exp: issuedAt + tokenTtlSeconds,
                jti: generateUUID()
            },
            encryptionKey
        );

        const verificationUrl = createVerificationUrl(verificationToken);
        
        await getEmailService().sendEmail(
            {
                to: normalizedEmail,
                subject: EMAIL_SUBJECTS.VERIFY_EMAIL,
                template: EMAIL_TEMPLATES.VERIFY_EMAIL,
                templateData: {
                    name,
                    verificationUrl,
                    tokenExpiry: `${tokenTtlSeconds / 60} minutes`
                }
            }, 
            signal,
            logger
        );

        return { 
            success: true, 
            message: AUTH_MESSAGES.VERIFICATION_SENT
        };
    };

    return { signup };
};


module.exports = createSigninService;
