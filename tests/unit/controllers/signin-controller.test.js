const createSigninController = require('#src/controllers/v1/signin.controller.js');

describe('signin controller', () => {
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
            signin: jest.fn().mockResolvedValue(result)
        };
        const controller = createSigninController(signinService);
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        const next = jest.fn();

        const abortSignal = new AbortController().signal;

        await controller.post({ body: input, abortSignal }, res, next);

        expect(signinService.signin).toHaveBeenCalledWith(input, abortSignal);
        expect(res.status).toHaveBeenCalledWith(202);
        expect(res.json).toHaveBeenCalledWith(result);
        expect(next).not.toHaveBeenCalled();
    });

    test('forwards service failures to error middleware', async () => {
        const error = new Error('database unavailable');
        const signinService = {
            signin: jest.fn().mockRejectedValue(error)
        };
        const controller = createSigninController(signinService);
        const next = jest.fn();

        await controller.post(
            { body: {} },
            { status: jest.fn(), json: jest.fn() },
            next
        );

        expect(next).toHaveBeenCalledWith(error);
    });
});
