const {
    describe,
    afterEach,
    test,
    expect,
    jest: jestApi
} = require('@jest/globals');
const passport = require('passport');
const passportJwt = require('../../../src/middlewares/passportJwt.middleware');

describe('passportJwt middleware factory', () => {
    afterEach(() => {
        jestApi.restoreAllMocks();
    });

    test.each([
        ['access', 'header', 'jwtAccessFromHeader'],
        ['refresh', 'cookie', 'jwtRefreshFromCookie']
    ])('authenticates %s tokens from %s', (type, source, strategy) => {
        const handler = jestApi.fn();
        const authenticate = jestApi.spyOn(passport, 'authenticate')
            .mockReturnValue(handler);

        const middleware = passportJwt({ type, source, options: { failWithError: true } });

        expect(middleware).toBe(handler);
        expect(authenticate).toHaveBeenCalledWith(strategy, {
            session: false,
            failWithError: true
        });
    });

    test('rejects unsupported type and source combinations', () => {
        expect(() => passportJwt({ type: 'access', source: 'cookie' }))
            .toThrow('Unsupported passport JWT type: access and source: cookie');
    });
});
