const { describe, test, expect, jest: jestApi } = require('@jest/globals');
const createGoogleCallbackController = require('../../../src/controllers/mainApp/v1/auth/oidc/googleCallback.controller');

describe('Google callback controller', () => {
    test('passes the request to the service and returns its result', async () => {
        const user = { id: '42', email: 'ada@example.com' };
        const service = jestApi.fn().mockResolvedValue(user);
        const controller = createGoogleCallbackController(service);
        const req = { user };
        const res = {
            status: jestApi.fn().mockReturnThis(),
            json: jestApi.fn()
        };
        const next = jestApi.fn();

        await controller.get(req, res, next);

        expect(service).toHaveBeenCalledWith(req);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: user });
        expect(next).not.toHaveBeenCalled();
    });

    test('forwards service errors to error middleware', async () => {
        const error = new Error('callback failed');
        const controller = createGoogleCallbackController(
            jestApi.fn().mockRejectedValue(error)
        );
        const next = jestApi.fn();

        await controller.get({}, {}, next);

        expect(next).toHaveBeenCalledWith(error);
    });
});
