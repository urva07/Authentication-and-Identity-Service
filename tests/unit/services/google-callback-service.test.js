const { describe, test, expect, jest: jestApi } = require('@jest/globals');
const { AuthenticationError } = require('../../../src/errors');
const createGoogleCallbackService = require('../../../src/services/mainApp/auth/oidc/googleCallback.service');

describe('Google callback service', () => {
    test('returns the authenticated user supplied by Passport', async () => {
        const user = { id: '42', email: 'ada@example.com' };
        const log = { debug: jestApi.fn() };
        const service = createGoogleCallbackService();

        await expect(service({ user, log })).resolves.toBe(user);
        expect(log.debug).toHaveBeenCalled();
    });

    test('rejects when Passport did not supply a user', async () => {
        const log = { debug: jestApi.fn() };
        const service = createGoogleCallbackService();

        await expect(service({ log })).rejects.toBeInstanceOf(AuthenticationError);
        expect(log.debug).toHaveBeenCalled();
    });
});
