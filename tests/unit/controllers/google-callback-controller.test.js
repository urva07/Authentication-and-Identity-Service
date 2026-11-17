const { describe, test, expect, jest: jestApi } = require('@jest/globals');
const createGoogleCallbackController = require('../../../src/controllers/mainApp/v1/auth/oidc/googleCallback.controller');

describe('Google callback controller', () => {
    test('returns the authenticated user supplied by Passport', async () => {
        const user = { id: '42', email: 'ada@example.com' };
        const controller = createGoogleCallbackController();
        const req = { user };
        const res = {
            status: jestApi.fn().mockReturnThis(),
            json: jestApi.fn()
        };
        const next = jestApi.fn();

        await controller.get(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, user });
        expect(next).not.toHaveBeenCalled();
    });

    test('forwards response errors to error middleware', async () => {
        const error = new Error('callback failed');
        const controller = createGoogleCallbackController();
        const next = jestApi.fn();

        await controller.get({}, { status: jestApi.fn(() => { throw error; }) }, next);

        expect(next).toHaveBeenCalledWith(error);
    });
});
