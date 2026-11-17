const { describe, test, expect, jest: jestApi } = require('@jest/globals');
const createGoogleCallbackService = require('../../../src/services/mainApp/auth/oidc/googleCallback.service');

describe('Google callback service', () => {
    test('returns the authenticated user supplied by Passport', async () => {
        const user = { id: '42', email: 'ada@example.com' };
        const log = { debug: jestApi.fn() };
        const service = createGoogleCallbackService();

        await expect(service(user, log)).resolves.toBe(user);
    });

    test('returns an absent user unchanged', async () => {
        const log = { debug: jestApi.fn() };
        const service = createGoogleCallbackService();

        await expect(service(undefined, log)).resolves.toBeUndefined();
    });
});
