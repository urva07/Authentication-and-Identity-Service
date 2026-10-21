const createSigninController = require('../../../src/controllers/signin.controller');

describe('signin controller', () => {
    test('passes validated input to the service and returns success', async () => {
        const input = {
            contactType: 'email',
            email: 'ada@example.com',
            password: 'secret',
            name: 'Ada Lovelace'
        };
        const signinService = {
            signin: jest.fn().mockResolvedValue({
                success: true,
                verificationToken: 'encrypted-token'
            })
        };
        const controller = createSigninController(signinService);
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        const next = jest.fn();

        await controller.post({ body: input }, res, next);

        expect(signinService.signin).toHaveBeenCalledWith(input);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true });
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
