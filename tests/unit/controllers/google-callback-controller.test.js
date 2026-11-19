const { describe, test, expect, jest: jestApi } = require('@jest/globals');
const config = require('../../../src/config/config');
const createGoogleCallbackController = require('../../../src/controllers/mainApp/v1/auth/oidc/googleCallback.controller');

describe('Google callback controller', () => {
    test('logs in the authenticated user and returns the resulting user', async () => {
        const user = { id: '42', email: 'ada@example.com' };
        const loginResult = {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            user
        };
        const googleCallbackService = {
            loginUser: jestApi.fn().mockResolvedValue(loginResult)
        };
        const controller = createGoogleCallbackController(googleCallbackService);
        const req = { user };
        const res = {
            cookie: jestApi.fn(),
            status: jestApi.fn().mockReturnThis(),
            json: jestApi.fn()
        };
        const next = jestApi.fn();

        await controller.get(req, res, next);

        expect(googleCallbackService.loginUser).toHaveBeenCalledWith(user, undefined);
        expect(res.cookie).toHaveBeenCalledWith(
            config.auth.jwt.cookieOptions.refresh.name,
            'refresh-token',
            expect.objectContaining({
                httpOnly: config.auth.jwt.cookieOptions.refresh.httpOnly,
                sameSite: config.auth.jwt.cookieOptions.refresh.sameSite
            })
        );
        expect(res.cookie).toHaveBeenCalledWith(
            config.auth.jwt.cookieOptions.access.name,
            'access-token',
            expect.objectContaining({
                httpOnly: config.auth.jwt.cookieOptions.access.httpOnly,
                sameSite: config.auth.jwt.cookieOptions.access.sameSite
            })
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, user });
        expect(next).not.toHaveBeenCalled();
    });

    test('forwards response errors to error middleware', async () => {
        const error = new Error('callback failed');
        const googleCallbackService = {
            loginUser: jestApi.fn().mockRejectedValue(error)
        };
        const controller = createGoogleCallbackController(googleCallbackService);
        const next = jestApi.fn();

        await controller.get(
            {},
            { cookie: jestApi.fn(), status: jestApi.fn(), json: jestApi.fn() },
            next
        );

        expect(next).toHaveBeenCalledWith(error);
    });
});
