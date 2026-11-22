const { describe, beforeEach, jest: jestApi, afterAll, test, expect } = require('@jest/globals');
const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('../../../src/errors');
const config = require('../../../src/config/config');
const authenticate = require('../../../src/middlewares/auth.middleware');

describe('authentication middleware', () => {
    const jwtSecret = 'test-secret-with-enough-entropy-for-signing';
    const originalSecrets = {
        access: config.auth.jwt.jwtAccessTokenSecret,
        refresh: config.auth.jwt.jwtRefreshTokenSecret
    };
    let findById;
    let userRepository;

    beforeEach(() => {
        config.auth.jwt.jwtAccessTokenSecret = jwtSecret;
        config.auth.jwt.jwtRefreshTokenSecret = jwtSecret;
        findById = jestApi.fn().mockImplementation(async (id) => ({ id }));
        userRepository = { findById };
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

        await authenticate({ source: 'cookie', userRepository })(req, {}, next);

        expect(req.user).toEqual({ id: '42' });
        expect(findById).toHaveBeenCalledWith('42');
        expect(next).toHaveBeenCalledWith();
    });

    test('accepts a bearer token from the authorization header', async () => {
        const token = jwt.sign({ sub: '42' }, jwtSecret);
        const req = { headers: { authorization: `Bearer ${token}` } };
        const next = jestApi.fn();

        await authenticate({ source: 'header', userRepository })(req, {}, next);

        expect(req.user).toEqual({ id: '42' });
        expect(next).toHaveBeenCalledWith();
    });

    test('does not accept a cookie when configured for header authentication', async () => {
        const token = jwt.sign({ sub: '42' }, jwtSecret);
        const next = jestApi.fn();

        await authenticate({ source: 'header', userRepository })({
            headers: {},
            cookies: { [config.auth.jwt.cookieOptions.access.name]: token }
        }, {}, next);

        expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
        expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('rejects malformed authorization headers', async () => {
        const token = jwt.sign({ sub: '42' }, jwtSecret);
        const next = jestApi.fn();

        await authenticate({ source: 'header', userRepository })({
            headers: { authorization: `Basic ${token}` }
        }, {}, next);

        expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
        expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('rejects invalid tokens from the configured source', async () => {
        const next = jestApi.fn();

        await authenticate({ source: 'cookie', userRepository })({
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

        await authenticate({ source: 'cookie', userRepository })({
            cookies: {
                [config.auth.jwt.cookieOptions.access.name]: token
            }
        }, {}, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Invalid JWT secret.' })
        );
    });

    test('rejects an unsupported authentication source', () => {
        expect(() => authenticate({ source: 'query' })).toThrow(TypeError);
    });

    test('rejects an unsupported token type', () => {
        expect(() => authenticate({
            source: 'header',
            tokenType: 'session',
            userRepository
        })).toThrow(TypeError);
    });

    test('returns authentication failure when the token payload has no matching user', async () => {
        const token = jwt.sign({ sub: 'missing' }, jwtSecret);
        findById.mockResolvedValue(null);
        const next = jestApi.fn();

        await authenticate({ source: 'header', userRepository })({
            headers: { authorization: `Bearer ${token}` }
        }, {}, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({
            statusCode: 401
        }));
    });

    test('returns unexpected verification errors unchanged', async () => {
        const next = jestApi.fn();
        const repositoryError = new Error('database unavailable');
        findById.mockRejectedValue(repositoryError);
        const token = jwt.sign({ sub: '42' }, jwtSecret);

        await authenticate({ source: 'header', userRepository })({
            headers: { authorization: `Bearer ${token}` }
        }, {}, next);

        expect(next).toHaveBeenCalledWith(repositoryError);
    });
});
