const { describe, beforeEach, jest: jestApi, afterAll, test, expect } = require('@jest/globals');
const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('../../../src/errors');
const config = require('../../../src/config/config');
const { configureRepositories } = require('../../../src/repositories');
const authenticate = require('../../../src/middlewares/auth.middleware');

describe('authentication middleware', () => {
    const jwtSecret = 'test-secret-with-enough-entropy-for-signing';
    const originalSecrets = {
        access: config.auth.jwt.jwtAccessTokenSecret,
        refresh: config.auth.jwt.jwtRefreshTokenSecret
    };
    let findByPk;

    beforeEach(() => {
        config.auth.jwt.jwtAccessTokenSecret = jwtSecret;
        config.auth.jwt.jwtRefreshTokenSecret = jwtSecret;
        findByPk = jestApi.fn().mockImplementation((id) => ({ id }));
        configureRepositories({
            User: { findByPk },
            UserPassword: {},
            IdentityProvider: {}
        });
    });

    afterAll(() => {
        config.auth.jwt.jwtAccessTokenSecret = originalSecrets.access;
        config.auth.jwt.jwtRefreshTokenSecret = originalSecrets.refresh;
    });

    test('accepts a valid access cookie', async () => {
        const token = jwt.sign({ sub: '42' }, jwtSecret);
        const req = {
            cookies: { [config.auth.jwt.cookieOptions.access.name]: token }
        };
        const next = jestApi.fn();

        await authenticate('cookie')(req, {}, next);

        expect(req.user).toEqual({ id: '42' });
        expect(findByPk).toHaveBeenCalledWith('42', {});
        expect(next).toHaveBeenCalledWith();
    });

    test('accepts a bearer token from the authorization header', async () => {
        const token = jwt.sign({ sub: '42' }, jwtSecret);
        const req = { headers: { authorization: `Bearer ${token}` } };
        const next = jestApi.fn();

        await authenticate('header')(req, {}, next);

        expect(req.user).toEqual({ id: '42' });
        expect(next).toHaveBeenCalledWith();
    });

    test('does not accept a cookie when configured for header authentication', async () => {
        const token = jwt.sign({ sub: '42' }, jwtSecret);
        const next = jestApi.fn();

        await authenticate('header')({
            headers: {},
            cookies: { [config.auth.jwt.cookieOptions.access.name]: token }
        }, {}, next);

        expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
        expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('rejects malformed authorization headers', async () => {
        const token = jwt.sign({ sub: '42' }, jwtSecret);
        const next = jestApi.fn();

        await authenticate('header')({
            headers: { authorization: `Basic ${token}` }
        }, {}, next);

        expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
        expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('rejects invalid tokens from the configured source', async () => {
        const next = jestApi.fn();

        await authenticate('cookie')({
            cookies: {
                [config.auth.jwt.cookieOptions.access.name]: 'invalid'
            }
        }, {}, next);

        expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
        expect(next.mock.calls[0][0]).toMatchObject({
            statusCode: 401,
            message: 'Authentication failed'
        });
    });

    test('reports invalid JWT configuration as an error', async () => {
        const token = jwt.sign({ sub: '42' }, jwtSecret);
        config.auth.jwt.jwtAccessTokenSecret = undefined;
        const next = jestApi.fn();

        await authenticate('cookie')({
            cookies: {
                [config.auth.jwt.cookieOptions.access.name]: token
            }
        }, {}, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Invalid JWT secret.' })
        );
    });

    test('rejects an unsupported authentication source', () => {
        expect(() => authenticate('query')).toThrow(TypeError);
    });
});
