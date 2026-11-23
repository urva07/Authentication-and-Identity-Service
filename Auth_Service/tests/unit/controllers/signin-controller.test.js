const { describe, test, jest: jestApi, expect } = require('@jest/globals');
const createSigninController = require('../../../src/controllers/mainApp/v1/auth/signup.controller');

describe('signup controller', () => {
    test('passes validated input to the service and returns success', async () => {
        const input = {
            contactType: 'email',
            email: 'ada@example.com',
            password: 'secret',
            name: 'Ada Lovelace'
        };
        const result = {
            success: true,
            message: 'A verification link has been sent to your email.'
        };
        const signinService = {
            signup: jestApi.fn().mockResolvedValue(result)
        };
        const controller = createSigninController(signinService);
        const res = {
            status: jestApi.fn().mockReturnThis(),
            json: jestApi.fn()
        };
        const next = jestApi.fn();

        const abortSignal = new AbortController().signal;
        const requestLogger = { debug: jestApi.fn() };

        await controller.post({ body: input, abortSignal, log: requestLogger }, res, next);

        expect(signinService.signup).toHaveBeenCalledWith(input, abortSignal, requestLogger);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(result);
        expect(next).not.toHaveBeenCalled();
    });

    test('forwards service failures to error middleware', async () => {
        const error = new Error('database unavailable');
        const signinService = {
            signup: jestApi.fn().mockRejectedValue(error)
        };
        const controller = createSigninController(signinService);
        const next = jestApi.fn();
        const requestLogger = { debug: jestApi.fn() };

        await controller.post(
            { body: {}, log: requestLogger },
            { status: jestApi.fn(), json: jestApi.fn() },
            next
        );

        expect(next).toHaveBeenCalledWith(error);
    });
});
