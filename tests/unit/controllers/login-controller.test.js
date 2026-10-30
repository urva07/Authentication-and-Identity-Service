const createLoginController = require('#src/controllers/v1/login.controller.js');

describe('login controller', () => {
    test('passes validated credentials to the service and returns its result', async () => {
        const credentials = {
            contactType: 'email',
            email: 'ada@example.com',
            password: 'secret'
        };
        const result = {
            token: 'signed-token',
            user: { id: '1', email: 'ada@example.com' }
        };
        const loginService = {
            loginUser: jest.fn().mockResolvedValue(result)
        };
        const controller = createLoginController(loginService);
        const res = {
            cookie: jest.fn(),
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        const next = jest.fn();

        await controller.post({ body: credentials }, res, next);

        expect(loginService.loginUser).toHaveBeenCalledWith(credentials);
        expect(res.cookie).toHaveBeenCalledWith(
            'auth_token',
            'signed-token',
            expect.objectContaining({
                httpOnly: true,
                sameSite: 'lax'
            })
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: { user: result.user }
        });
        expect(next).not.toHaveBeenCalled();
    });

    test('forwards service errors to error middleware', async () => {
        const error = new Error('login failed');
        const loginService = {
            loginUser: jest.fn().mockRejectedValue(error)
        };
        const controller = createLoginController(loginService);
        const next = jest.fn();

        await controller.post(
            { body: {} },
            { cookie: jest.fn(), status: jest.fn(), json: jest.fn() },
            next
        );

        expect(next).toHaveBeenCalledWith(error);
    });
});
