const { describe, jest: jestApi, test, expect } = require('@jest/globals');
const createVerifyEmailController = require('../../../src/controllers/mainApp/v1/auth/verifyEmail.controller');

describe('verify email controller', () => {
    const createResponse = () => ({
        cookie: jestApi.fn(),
        status: jestApi.fn().mockReturnThis(),
        json: jestApi.fn()
    });

    test('passes the query token to the service and returns the created user', async () => {
        const user = { id: 'user-id', email: 'ada@example.com' };
        const verifyEmailService = {
            verifyEmail: jestApi.fn().mockResolvedValue({
                conflict: false,
                accessToken: 'access',
                refreshToken: 'refresh',
                response: { success: true, user }
            })
        };
        const controller = createVerifyEmailController(verifyEmailService);
        const res = createResponse();
        const next = jestApi.fn();
        const requestLogger = { debug: jestApi.fn() };

        await controller.get(
            { query: { token: 'v1.token' }, log: requestLogger },
            res,
            next
        );

        expect(verifyEmailService.verifyEmail).toHaveBeenCalledWith(
            'v1.token',
            requestLogger
        );
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.cookie).toHaveBeenCalledTimes(2);
        expect(res.json).toHaveBeenCalledWith({ success: true, user });
        expect(next).not.toHaveBeenCalled();
    });

    test('forwards service errors to error middleware', async () => {
        const error = new Error('verification failed');
        const verifyEmailService = {
            verifyEmail: jestApi.fn().mockRejectedValue(error)
        };
        const controller = createVerifyEmailController(verifyEmailService);
        const res = createResponse();
        const next = jestApi.fn();
        const requestLogger = { debug: jestApi.fn() };

        await controller.get(
            { query: { token: 'v1.token' }, log: requestLogger },
            res,
            next
        );

        expect(next).toHaveBeenCalledWith(error);
        expect(res.status).not.toHaveBeenCalled();
    });
});
