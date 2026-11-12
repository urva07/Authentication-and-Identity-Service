const { describe, test, jest: jestApi, expect } = require('@jest/globals');
const config = require('../../../src/config/config');
const createRefreshController = require('../../../src/controllers/mainApp/v1/auth/refresh.controller');

describe('refresh controller', () => {
    test('passes the authenticated user to the service and sets the access-token cookie', async () => {
        const user = { id: '42' };
        const refreshService = {
            refreshAccessToken: jestApi.fn().mockReturnValue('signed-access-token')
        };
        const controller = createRefreshController(refreshService);
        const res = {
            cookie: jestApi.fn(),
            status: jestApi.fn().mockReturnThis(),
            json: jestApi.fn()
        };
        const next = jestApi.fn();
        const requestLogger = { debug: jestApi.fn() };

        await controller.post({ user, log: requestLogger }, res, next);

        expect(refreshService.refreshAccessToken).toHaveBeenCalledWith(
            user,
            requestLogger
        );
        expect(res.cookie).toHaveBeenCalledWith(
            config.auth.jwt.cookieOptions.access.name,
            'signed-access-token',
            expect.objectContaining({
                httpOnly: config.auth.jwt.cookieOptions.access.httpOnly,
                sameSite: config.auth.jwt.cookieOptions.access.sameSite,
                path: config.auth.jwt.cookieOptions.access.path
            })
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true
        });
        expect(res.json.mock.calls[0][0]).not.toHaveProperty('data.accessToken');
        expect(next).not.toHaveBeenCalled();
    });

    test('forwards service errors to error middleware', async () => {
        const error = new Error('token signing failed');
        const controller = createRefreshController({
            refreshAccessToken: jestApi.fn().mockRejectedValue(error)
        });
        const next = jestApi.fn();
        const requestLogger = { debug: jestApi.fn() };

        await controller.post(
            { user: { id: '42' }, log: requestLogger },
            { cookie: jestApi.fn(), status: jestApi.fn(), json: jestApi.fn() },
            next
        );

        expect(next).toHaveBeenCalledWith(error);
    });
});
