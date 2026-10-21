const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('../../../src/errors');
const config = require('../../../src/config/config');
const authenticate = require('../../../src/middlewares/auth.middleware');

describe('authentication middleware', () => {
    const jwtSecret = 'test-secret-with-enough-entropy-for-signing';
    const originalJwtSecret = config.auth.jwtSecret;

    beforeEach(() => {
        config.auth.jwtSecret = jwtSecret;
    });

    afterAll(() => {
        config.auth.jwtSecret = originalJwtSecret;
    });

    test('accepts a valid auth cookie when configured for cookie authentication', () => {
        const token = jwt.sign({ sub: '42' }, jwtSecret);
        const req = { cookies: { auth_token: token } };
        const next = jest.fn();

        authenticate('cookie')(req, {}, next);

        expect(req.user).toEqual({ id: '42' });
        expect(next).toHaveBeenCalledWith();
    });

    test('accepts a bearer token when configured for authorization-header authentication', () => {
        const token = jwt.sign({ sub: '42' }, jwtSecret);
        const req = { headers: { authorization: `Bearer ${token}` } };
        const next = jest.fn();

        authenticate('authorization')(req, {}, next);

        expect(req.user).toEqual({ id: '42' });
        expect(next).toHaveBeenCalledWith();
    });

    test('does not accept a cookie when configured for authorization-header authentication', () => {
        const token = jwt.sign({ sub: '42' }, jwtSecret);
        const next = jest.fn();

        authenticate('authorization')({
            headers: {},
            cookies: { auth_token: token }
        }, {}, next);

        expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
        expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('does not accept an authorization header when configured for cookie authentication', () => {
        const token = jwt.sign({ sub: '42' }, jwtSecret);
        const next = jest.fn();

        authenticate('cookie')({
            headers: { authorization: `Bearer ${token}` },
            cookies: {}
        }, {}, next);

        expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
        expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('rejects malformed authorization headers', () => {
        const token = jwt.sign({ sub: '42' }, jwtSecret);
        const next = jest.fn();

        authenticate('authorization')({
            headers: { authorization: `Basic ${token}` },
            cookies: { auth_token: token }
        }, {}, next);

        expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
        expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('rejects invalid tokens from the configured source', () => {
        const next = jest.fn();

        authenticate('cookie')(
            { cookies: { auth_token: 'invalid' } },
            {},
            next
        );

        expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
        expect(next.mock.calls[0][0]).toMatchObject({
            statusCode: 401,
            message: 'Authentication failed'
        });
    });

    test('reports missing JWT configuration as an authentication error', () => {
        config.auth.jwtSecret = undefined;
        const next = jest.fn();
        const token = jwt.sign({ sub: '42' }, jwtSecret);

        authenticate('cookie')(
            { cookies: { auth_token: token } },
            {},
            next
        );

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'AuthenticationError',
                statusCode: 500,
                message: 'Authentication is not configured'
            })
        );
        expect(next.mock.calls[0][0]).toBeInstanceOf(AuthenticationError);
    });

    test('rejects an unsupported authentication source', () => {
        expect(() => authenticate('query')).toThrow(TypeError);
    });
});
