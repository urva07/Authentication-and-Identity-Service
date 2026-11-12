const { describe, beforeEach, jest: jestApi, afterAll, test, expect } = require('@jest/globals');
const jwt = require('jsonwebtoken');
const config = require('#src/config/config.js');
const createForgotPasswordService = require('#src/services/mainApp/auth/forgotPassword.service.js');
const createForgotPasswordController = require('#src/controllers/mainApp/v1/auth/forgotPassword.controller.js');

describe('forgot password', () => {
    const secret = 'c3a1f5d9b7e24680a1c3e5f70912b4d6e8f0a2c4b6d8e0f1a3b5c7d9e1f30415';
    const original = { ...config.auth.jwt };
    const apiBaseUrl = config.app.apiBaseUrl;
    let userRepository;
    let emailService;
    let activeTokenRepository;
    let service;

    beforeEach(() => {
        config.auth.jwt.jwtPasswordResetTokenSecret = secret;
        config.auth.jwt.jwtPasswordResetTokenTtlSeconds = 900;
        config.app.apiBaseUrl = 'https://api.example.com';
        userRepository = { findByEmail: jestApi.fn() };
        emailService = { sendEmail: jestApi.fn().mockResolvedValue({}) };
        activeTokenRepository = { create: jestApi.fn().mockResolvedValue({}) };
        service = createForgotPasswordService({
            userRepository,
            emailService,
            activeTokenRepository
        });
    });

    afterAll(() => {
        Object.assign(config.auth.jwt, original);
        config.app.apiBaseUrl = apiBaseUrl;
    });

    test('emails a signed change-password link containing user id and email', async () => {
        const requestLogger = { debug: jestApi.fn() };
        userRepository.findByEmail.mockResolvedValue({
            id: 'user-1',
            email: 'ada@example.com',
            firstName: 'Ada'
        });

        const result = await service.forgotPassword(
            { email: 'ADA@example.com' },
            undefined,
            requestLogger
        );

        expect(userRepository.findByEmail).toHaveBeenCalledWith('ada@example.com');
        expect(requestLogger.debug).toHaveBeenCalled();
        expect(emailService.sendEmail.mock.calls[0][2]).toBe(requestLogger);
        expect(result.success).toBe(true);
        const message = emailService.sendEmail.mock.calls[0][0];
        expect(message).toMatchObject({ to: 'ada@example.com', subject: 'Reset your password' });
        expect(message.html).toContain('Reset your password');
        expect(message.html).toContain('15 minutes');

        const url = new URL(message.text.match(/https:\/\/\S+/)[0]);
        expect(url.origin + url.pathname).toBe('https://api.example.com/v1/auth/change-password');
        const payload = jwt.verify(url.searchParams.get('token'), secret);
        expect(payload).toMatchObject({
            sub: 'user-1',
            email: 'ada@example.com',
            purpose: 'password-reset'
        });
        expect(payload.exp - payload.iat).toBe(900);
        expect(activeTokenRepository.create).toHaveBeenCalledWith({
            tokenType: 'password-reset',
            jti: payload.jti,
            userId: 'user-1',
            expiresAt: new Date(payload.exp * 1000)
        });
        expect(activeTokenRepository.create.mock.invocationCallOrder[0])
            .toBeLessThan(emailService.sendEmail.mock.invocationCallOrder[0]);
    });

    test('does not create a token or send email when the user does not exist', async () => {
        userRepository.findByEmail.mockResolvedValue(null);

        const result = await service.forgotPassword({ email: 'nobody@example.com' });

        expect(result.success).toBe(true);
        expect(emailService.sendEmail).not.toHaveBeenCalled();
        expect(activeTokenRepository.create).not.toHaveBeenCalled();
    });

    test('does not send a link if storing its token fails', async () => {
        const error = new Error('database unavailable');
        userRepository.findByEmail.mockResolvedValue({ id: 'user-1', email: 'ada@example.com' });
        activeTokenRepository.create.mockRejectedValue(error);

        await expect(service.forgotPassword({ email: 'ada@example.com' })).rejects.toBe(error);
        expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    test('uses the configured reset secret when signing the reset token', async () => {
        config.auth.jwt.jwtPasswordResetTokenSecret = 'short';
        userRepository.findByEmail.mockResolvedValue({ id: 'user-1', email: 'ada@example.com' });

        await expect(service.forgotPassword({ email: 'ada@example.com' }))
            .resolves.toMatchObject({ success: true });

        const message = emailService.sendEmail.mock.calls[0][0];
        const url = new URL(message.text.match(/https:\/\/\S+/)[0]);
        expect(jwt.verify(url.searchParams.get('token'), 'short')).toMatchObject({
            sub: 'user-1',
            email: 'ada@example.com',
            purpose: 'password-reset'
        });
    });

    test('controller passes input and abort signal to the service', async () => {
        const result = { success: true, message: 'sent' };
        const forgotPasswordService = { forgotPassword: jestApi.fn().mockResolvedValue(result) };
        const controller = createForgotPasswordController(forgotPasswordService);
        const res = { status: jestApi.fn().mockReturnThis(), json: jestApi.fn() };
        const next = jestApi.fn();
        const abortSignal = new AbortController().signal;
        const requestLogger = { debug: jestApi.fn() };

        await controller.post(
            { body: { email: 'ada@example.com' }, abortSignal, log: requestLogger },
            res,
            next
        );

        expect(forgotPasswordService.forgotPassword)
            .toHaveBeenCalledWith(
                { email: 'ada@example.com' },
                abortSignal,
                requestLogger
            );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(result);
        expect(next).not.toHaveBeenCalled();
    });
});
