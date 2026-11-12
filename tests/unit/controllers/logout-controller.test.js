const { describe, test, jest: jestApi, expect } = require('@jest/globals');
const config = require('../../../src/config/config');
const createLogoutController = require('../../../src/controllers/mainApp/v1/auth/logout.controller');

describe('logout controller', () => {
    test('clears access and refresh token cookies after logout service succeeds', async () => {
        const logoutService = {
            logoutUser: jestApi.fn().mockReturnValue({ loggedOut: true })
        };
        const controller = createLogoutController(logoutService);
        const res = {
            clearCookie: jestApi.fn(),
            status: jestApi.fn().mockReturnThis(),
            json: jestApi.fn()
        };
        const next = jestApi.fn();
        const requestLogger = { debug: jestApi.fn() };

        await controller.post({ log: requestLogger }, res, next);

        expect(logoutService.logoutUser).toHaveBeenCalledWith(requestLogger);
        expect(res.clearCookie).toHaveBeenCalledWith(
            config.auth.jwt.cookieOptions.access.name,
            expect.objectContaining({
                path: config.auth.jwt.cookieOptions.access.path
            })
        );
        expect(res.clearCookie).toHaveBeenCalledWith(
            config.auth.jwt.cookieOptions.refresh.name,
            expect.objectContaining({
                path: config.auth.jwt.cookieOptions.refresh.path
            })
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true });
        expect(next).not.toHaveBeenCalled();
    });

    test('forwards logout service errors to error middleware', async () => {
        const error = new Error('logout failed');
        const controller = createLogoutController({
            logoutUser: jestApi.fn().mockRejectedValue(error)
        });
        const next = jestApi.fn();
        const requestLogger = { debug: jestApi.fn() };

        await controller.post(
            { log: requestLogger },
            { clearCookie: jestApi.fn(), status: jestApi.fn(), json: jestApi.fn() },
            next
        );

        expect(next).toHaveBeenCalledWith(error);
    });
});
