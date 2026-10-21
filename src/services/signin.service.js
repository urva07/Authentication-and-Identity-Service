const bcrypt = require('bcryptjs');
const { createCipheriv, createHash, randomBytes } = require('node:crypto');
const config = require('../config/config');
const { AppError, ConflictError } = require('../errors');
const { getUserRepository } = require('../repositories');
const createEmailService = require('./email.service');

const TOKEN_VERSION = 'v1';
const TOKEN_TTL_SECONDS = 24 * 60 * 60;
const BCRYPT_SALT_ROUNDS = 12;
const VERIFY_EMAIL_PATH = '/api/v1/auth/verify-email';

const createSigninService = ({
    userRepository,
    tokenSecret = config.auth.signinTokenSecret,
    emailService,
    apiBaseUrl = config.app.apiBaseUrl
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

    const createEncryptionKey = () => {
        if (!tokenSecret || Buffer.byteLength(tokenSecret) < 32) {
            throw new Error(
                'Sign-in token encryption requires a secret of at least 32 bytes',
                500
            );
        }

        return createHash('sha256')
            .update('first-shell-project:signin-verification:v1\0')
            .update(tokenSecret)
            .digest();
    };

    const createVerificationToken = (payload, encryptionKey) => {
        const iv = randomBytes(12);
        const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
        cipher.setAAD(Buffer.from(TOKEN_VERSION));
        const ciphertext = Buffer.concat([
            cipher.update(JSON.stringify(payload), 'utf8'),
            cipher.final()
        ]);

        return [
            TOKEN_VERSION,
            iv.toString('base64url'),
            cipher.getAuthTag().toString('base64url'),
            ciphertext.toString('base64url')
        ].join('.');
    };

    const createVerificationUrl = (token) => {
        let verificationUrl;
        try {
            verificationUrl = new URL(VERIFY_EMAIL_PATH, apiBaseUrl);
        } catch (error) {
            throw new Error(
                'API_BASE_URL must be a valid HTTP(S) URL',
                500
            );
        }

        if (!['http:', 'https:'].includes(verificationUrl.protocol)) {
            throw new Error(
                'API_BASE_URL must be a valid HTTP(S) URL',
                500
            );
        }

        verificationUrl.searchParams.set('token', token);
        return verificationUrl.toString();
    };

    const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);

    const getEmailService = () => {
        if (emailService) {
            return emailService;
        }

        productionEmailService ||= createEmailService();
        return productionEmailService;
    };

    const signin = async ({ email, password, name }) => {
        const normalizedEmail = email.trim().toLowerCase();
        const repository = userRepository || getUserRepository();
        const existingUser = await repository.findByEmail(normalizedEmail);

        if (existingUser) {
            throw new ConflictError('An account with this email already exists');
        }

        const encryptionKey = createEncryptionKey();
        const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
        const issuedAt = Math.floor(Date.now() / 1000);
        const verificationToken = createVerificationToken(
            {
                email: normalizedEmail,
                passwordHash,
                name,
                iat: issuedAt,
                exp: issuedAt + TOKEN_TTL_SECONDS
            },
            encryptionKey
        );

        const verificationUrl = createVerificationUrl(verificationToken);
        await getEmailService().sendEmail({
            to: normalizedEmail,
            subject: 'Verify your email address',
            text: [
                `Hello ${name},`,
                '',
                'Verify your email address by opening this link:',
                verificationUrl,
                '',
                'This link expires in 24 hours. If you did not request this, you can ignore this email.'
            ].join('\n'),
            html: [
                '<!doctype html>',
                '<html lang="en"><body>',
                `<p>Hello ${escapeHtml(name)},</p>`,
                '<p>Verify your email address using the link below. This link expires in 24 hours.</p>',
                `<p><a href="${escapeHtml(verificationUrl)}">Verify email address</a></p>`,
                `<p>If the link does not work, copy and paste this URL:</p><p>${escapeHtml(verificationUrl)}</p>`,
                '<p>If you did not request this, you can ignore this email.</p>',
                '</body></html>'
            ].join('')
        });

        return { success: true };
    };

    return { signin };
};

module.exports = createSigninService;
