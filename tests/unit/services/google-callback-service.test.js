const { describe, test, expect, jest: jestApi } = require('@jest/globals');
const { AuthenticationError } = require('../../../src/errors');
const createGoogleCallbackService = require('../../../src/services/mainApp/auth/oidc/googleCallback.service');

describe('Google callback service', () => {
    test('logs in the authenticated user supplied by Passport', async () => {
        const user = { id: '42', email: 'ada@example.com' };
        const result = {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            user
        };
        const passportLoginService = {
            loginUser: jestApi.fn().mockResolvedValue(result)
        };
        const log = { debug: jestApi.fn() };
        const service = createGoogleCallbackService(passportLoginService);

        await expect(service.loginUser(user, log)).resolves.toBe(result);
        expect(passportLoginService.loginUser).toHaveBeenCalledWith(user, log);
    });

    test('rejects when Passport supplies no user', async () => {
        const passportLoginService = { loginUser: jestApi.fn() };
        const log = { warn: jestApi.fn() };
        const service = createGoogleCallbackService(passportLoginService);

        await expect(service.loginUser(undefined, log)).rejects.toBeInstanceOf(
            AuthenticationError
        );
        expect(passportLoginService.loginUser).not.toHaveBeenCalled();
    });
});
