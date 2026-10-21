const bcrypt = require('bcryptjs');
const { createDecipheriv, createHash } = require('node:crypto');
const { ConflictError } = require('../../../src/errors');
const createSigninService = require('../../../src/services/signin.service');

describe('signin service', () => {
    const tokenSecret = 'b7f2c9a4e1d6380f5a0e9d3c7b1f6428c4e8a2f6d0b9137e1f5c8b3a6d2e9047';
    let userRepository;
    let emailService;
    let signinService;

    beforeEach(() => {
        userRepository = {
            findByEmail: jest.fn().mockResolvedValue(null)
        };
        emailService = {
            sendEmail: jest.fn().mockResolvedValue({ messageId: 'email-1' })
        };
        signinService = createSigninService({
            userRepository,
            tokenSecret,
            emailService,
            apiBaseUrl: 'https://api.example.com'
        });
    });

    const decryptToken = (token) => {
        const [version, ivPart, tagPart, ciphertextPart] = token.split('.');
        expect(version).toBe('v1');

        const encryptionKey = createHash('sha256')
            .update('first-shell-project:signin-verification:v1\0')
            .update(tokenSecret)
            .digest();
        const decipher = createDecipheriv(
            'aes-256-gcm',
            encryptionKey,
            Buffer.from(ivPart, 'base64url')
        );
        decipher.setAAD(Buffer.from(version));
        decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));

        return JSON.parse(Buffer.concat([
            decipher.update(Buffer.from(ciphertextPart, 'base64url')),
            decipher.final()
        ]).toString('utf8'));
    };

    test('checks for an existing email and emails an encrypted verification link', async () => {
        const input = {
            contactType: 'email',
            email: 'ADA@example.com',
            password: 'test-password',
            name: 'Ada Lovelace'
        };

        const result = await signinService.signin(input);

        expect(userRepository.findByEmail).toHaveBeenCalledWith(
            'ada@example.com'
        );
        expect(result).toEqual({ success: true });
        expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
        const email = emailService.sendEmail.mock.calls[0][0];
        expect(email).toMatchObject({
            to: 'ada@example.com',
            subject: 'Verify your email address'
        });
        expect(email.text).toContain(
            'https://api.example.com/api/v1/auth/verify-email?token='
        );
        expect(email.html).toContain('Verify email address');

        const verificationUrl = new URL(email.text.match(/https:\/\/\S+/)[0]);
        const tokenPayload = decryptToken(
            verificationUrl.searchParams.get('token')
        );
        expect(tokenPayload).toMatchObject({
            email: 'ada@example.com',
            name: 'Ada Lovelace'
        });
        expect(await bcrypt.compare('test-password', tokenPayload.passwordHash))
            .toBe(true);
        expect(tokenPayload.passwordHash).not.toBe(input.password);
        expect(tokenPayload.exp - tokenPayload.iat).toBe(24 * 60 * 60);
    });

    test('propagates email delivery errors', async () => {
        const error = new Error('SMTP delivery failed');
        emailService.sendEmail.mockRejectedValue(error);

        await expect(signinService.signin({
            email: 'ada@example.com',
            password: 'test-password',
            name: 'Ada Lovelace'
        })).rejects.toBe(error);
    });

    test('rejects an invalid API base URL instead of sending a malformed link', async () => {
        const service = createSigninService({
            userRepository,
            tokenSecret,
            emailService,
            apiBaseUrl: 'not a URL'
        });

        await expect(service.signin({
            email: 'ada@example.com',
            password: 'test-password',
            name: 'Ada Lovelace'
        })).rejects.toMatchObject({
            statusCode: 500,
            message: 'API_BASE_URL must be a valid HTTP(S) URL'
        });
        expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    test('rejects an email that already belongs to a user', async () => {
        userRepository.findByEmail.mockResolvedValue({ id: 7 });

        const signinAttempt = signinService.signin({
            email: 'ada@example.com',
            password: 'test-password',
            name: 'Ada Lovelace'
        });

        await expect(signinAttempt).rejects.toBeInstanceOf(ConflictError);
        await expect(signinAttempt).rejects.toMatchObject({
            name: 'ConflictError',
            statusCode: 409,
            message: 'An account with this email already exists'
        });
    });

    test('requires a valid encryption secret', async () => {
        const service = createSigninService({
            userRepository,
            tokenSecret: 'too-short'
        });

        await expect(service.signin({
            email: 'ada@example.com',
            password: 'test-password',
            name: 'Ada Lovelace'
        })).rejects.toMatchObject({
            statusCode: 500,
            message: 'Sign-in token encryption requires a secret of at least 32 bytes'
        });
    });
});
