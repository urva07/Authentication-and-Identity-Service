const { describe, test, expect, jest: jestApi } = require('@jest/globals');
const { AuthenticationError } = require('../../../src/errors');
const createVerifyService = require('../../../src/services/mainApp/auth/verify.service');

describe('verify service', () => {
    const userId = '3f0c1d52-8a7e-4b1c-9d34-5e6f7a8b9c0d';
    test('returns the authenticated user supplied by the middleware', async () => {
        const user = {
            id: userId,
            email: 'ada@example.com',
            phone: null,
            firstName: 'Ada',
            lastName: 'Lovelace',
            profilePhoto: null,
            profileCompleted: true
        };
        const verifyService = createVerifyService();
        const requestLogger = { debug: jestApi.fn() };

        await expect(verifyService.verifyUser(user, requestLogger)).resolves.toBe(user);
        expect(requestLogger.debug).toHaveBeenCalled();
    });

    test('rejects when authentication did not supply a user', async () => {
        const verifyService = createVerifyService();

        await expect(verifyService.verifyUser(undefined)).rejects.toBeInstanceOf(
            AuthenticationError
        );
    });
});
