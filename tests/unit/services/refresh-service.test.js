const jwt = require('jsonwebtoken');
const config = require('../../../src/config/config');
const { AuthenticationError, AppError } = require('../../../src/errors');
const createRefreshService = require('../../../src/services/refresh.service');

describe('refresh service', () => {
    const jwtSecret = 'test-secret-with-enough-entropy-for-signing';
    const originalJwtSecret = config.auth.jwtSecret;

    afterEach(() => {
        config.auth.jwtSecret = originalJwtSecret;
    });

    test('creates an access token for the authenticated user', () => {
        config.auth.jwtSecret = jwtSecret;
        const refreshService = createRefreshService();

        const accessToken = refreshService.refreshAccessToken({
            id: '42',
            email: 'ada@example.com'
        });

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
        config.auth.jwtSecret = 'short';
        const refreshService = createRefreshService();

        expect(() =>
            refreshService.refreshAccessToken({ id: '42' })
        ).toThrow(AppError);
    });
});
