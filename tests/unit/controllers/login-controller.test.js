const { describe, test, jest: jestApi, expect } = require('@jest/globals');
const config = require('../../../src/config/config');
const createLoginController = require('../../../src/controllers/mainApp/v1/auth/login.controller');

describe('login controller', () => {
    test('passes the authenticated user to the service and returns its result', async () => {
        const credentials = {
            contactType: 'email',
            email: 'ada@example.com',
            password: 'secret'
        };
        const authenticatedUser = { id: '1' };
        const result = {
            accessToken: 'signed-access-token',
            refreshToken: 'signed-refresh-token',
            user: { id: '1', email: 'ada@example.com' }
        };
        const loginService = {
            loginUser: jestApi.fn().mockResolvedValue(result)
        };
        const controller = createLoginController(loginService);
        const res = {
            cookie: jestApi.fn(),
            status: jestApi.fn().mockReturnThis(),
            json: jestApi.fn()
        };
        const next = jestApi.fn();
        const requestLogger = { debug: jestApi.fn() };

        await controller.post(
            { body: credentials, user: authenticatedUser, log: requestLogger },
            res,
            next
        );

        expect(loginService.loginUser).toHaveBeenCalledWith(
            authenticatedUser,
            requestLogger
        );
        expect(res.cookie).toHaveBeenCalledWith(
            config.auth.jwt.cookieOptions.refresh.name,
            'signed-refresh-token',
            expect.objectContaining({
                httpOnly: config.auth.jwt.cookieOptions.refresh.httpOnly,
                sameSite: config.auth.jwt.cookieOptions.refresh.sameSite
            })
        );
        expect(res.cookie).toHaveBeenCalledWith(
            config.auth.jwt.cookieOptions.access.name,
            'signed-access-token',
            expect.objectContaining({
                httpOnly: config.auth.jwt.cookieOptions.access.httpOnly,
                sameSite: config.auth.jwt.cookieOptions.access.sameSite
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
            loginUser: jestApi.fn().mockRejectedValue(error)
        };
        const controller = createLoginController(loginService);
        const next = jestApi.fn();
        const requestLogger = { debug: jestApi.fn() };

        await controller.post(
            { body: {}, log: requestLogger },
            { cookie: jestApi.fn(), status: jestApi.fn(), json: jestApi.fn() },
            next
        );

        expect(next).toHaveBeenCalledWith(error);
    });
});
