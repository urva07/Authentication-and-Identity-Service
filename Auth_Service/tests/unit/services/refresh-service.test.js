const { describe, afterEach, test, expect, jest: jestApi } = require('@jest/globals');
const jwt = require('jsonwebtoken');
const config = require('../../../src/config/config');
const { AuthenticationError, AppError } = require('../../../src/errors');
const createRefreshService = require('../../../src/services/mainApp/auth/refresh.service');

describe('refresh service', () => {
    const jwtSecret = 'test-secret-with-enough-entropy-for-signing';
    const originalJwtSecret = config.auth.jwt.jwtAccessTokenSecret;

    afterEach(() => {
        config.auth.jwt.jwtAccessTokenSecret = originalJwtSecret;
    });

    test('creates an access token for the authenticated user', () => {
        config.auth.jwt.jwtAccessTokenSecret = jwtSecret;
        const refreshService = createRefreshService();
        const requestLogger = { debug: jestApi.fn() };

        const accessToken = refreshService.refreshAccessToken({
            id: '42',
            email: 'ada@example.com'
        }, requestLogger);

        expect(requestLogger.debug).toHaveBeenCalled();
        expect(jwt.verify(accessToken, jwtSecret)).toMatchObject({
            sub: '42'
        });
    });

    test('rejects a missing authenticated user ID', () => {
        const refreshService = createRefreshService();
        expect(() => refreshService.refreshAccessToken({})).toThrow(
            AuthenticationError
        );
    });

    test('rejects a missing or weak JWT secret', () => {
        config.auth.jwt.jwtAccessTokenSecret = 'short';
        const refreshService = createRefreshService();

        expect(() =>
            refreshService.refreshAccessToken({ id: '42' })
        ).toThrow(AppError);
    });
});
