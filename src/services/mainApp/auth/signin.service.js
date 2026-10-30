const path = require('node:path');
const ejs = require('ejs');
const config = require('../../../config/config');
const { ConflictError } = require('../../../errors');
const { getUserRepository } = require('../../../repositories');
const createEmailService = require('./email.service');
const { hashPassword } = require('#src/utils/hashPasswordAndVerify.js');
const { generateAes256GcmToken } = require('#src/utils/aes256GcmToken.js');
const { createSigninTokenKey } = require('#src/utils/signinTokenKey.js');
const logger = require('#src/utils/logger.js');

const VERIFY_EMAIL_PATH = '/v1/auth/verify-email';

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
    const tokenSecret = config.auth.basic.signinAes256GcmTokenSecret;

    const createEncryptionKey = () => createSigninTokenKey(tokenSecret);

    const createVerificationUrl = (token) => {
        let verificationUrl = new URL(VERIFY_EMAIL_PATH, config.app.apiBaseUrl);

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

    const signin = async ({ email, password, name }, signal) => {
        const normalizedEmail = email.trim().toLowerCase();
        const repository = userRepository || getUserRepository();
        const existingUser = await repository.findByEmail(normalizedEmail);

        if (existingUser) {
            logger.debug(`Sign-in attempt with existing email: ${normalizedEmail}`);
            throw new ConflictError('An account with this email already exists');
        }

        const encryptionKey = createEncryptionKey();
        const passwordHash = await hashPassword(password, config.auth.basic.hashSaltRounds);
        const issuedAt = Math.floor(Date.now() / 1000);
        const tokenTtlSeconds = config.auth.basic.signinAes256GcmTokenTtlSeconds;
        const verificationToken = generateAes256GcmToken(
            {
                email: normalizedEmail,
                passwordHash,
                name,
                iat: issuedAt,
                exp: issuedAt + tokenTtlSeconds
            },
            encryptionKey
        );

        const verificationUrl = createVerificationUrl(verificationToken);
        const html = await ejs.renderFile(
            path.join(__dirname, '../views/verifyEmail.ejs'),
            { 
                name, 
                verificationUrl, 
                tokenExpiry: `${tokenTtlSeconds / 60} minutes` 
            }
        );
        
        await getEmailService().sendEmail(
            {
                to: normalizedEmail,
                subject: 'Verify your email address',
                text: [
                    `Hello ${name},`,
                    '',
                    'Verify your email address by opening this link:',
                    verificationUrl,
                    '',
                    `This link expires in ${tokenTtlSeconds / 60} minutes. If you did not request this, you can ignore this email.`
                ].join('\n'),
                html
            }, 
            signal
        );

        return { 
            success: true, 
            message: "A verification link has been sent to your email. Please verify your email to continue."
        };
    };

    return { signin };
};

module.exports = createSigninService;
