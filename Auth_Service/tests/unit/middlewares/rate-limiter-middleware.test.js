const {
    describe,
    test,
    expect,
    jest: jestApi
} = require('@jest/globals');

describe('dynamic rate limiter middleware', () => {
    test('matches a mounted v1 route by its normalized path', () => {
        jestApi.resetModules();

        const limiter = jestApi.fn((req, res, next) => next());
        const rateLimit = jestApi.fn(() => limiter);
        rateLimit.ipKeyGenerator = jestApi.fn((ip) => `normalized:${ip}`);

        jestApi.doMock('express-rate-limit', () => ({
            rateLimit,
            ipKeyGenerator: rateLimit.ipKeyGenerator
        }));
        jestApi.doMock('#src/constants/index.js', () => ({
            keyGeneratorsKeys: {
                IP: 'ip',
                ANONYMOUS_ACCOUNT: 'anonymousAccount',
                TOKEN: 'token',
                QUERY_TOKEN: 'queryToken',
                USER: 'user'
            },
            rateLimitConfig: {
                v1: {
                    'v1/auth/login': {
                        windowMs: 900000,
                        limit: 5,
                        keyGenerator: 'anonymousAccount'
                    }
                }
            }
        }));

        const { dynamicRateLimiter } = require('../../../src/middlewares/rateLimiter.middleware');
        const req = {
            path: '/v1/auth/login',
            originalUrl: '/v1/auth/login',
            method: 'POST',
            ip: '2001:db8:1234:5678::1',
            body: {},
            headers: {},
            query: {},
            log: { debug: jestApi.fn() }
        };
        const next = jestApi.fn();

        dynamicRateLimiter(req, {}, next);

        expect(rateLimit).toHaveBeenCalledTimes(1);
        expect(limiter).toHaveBeenCalledWith(req, {}, next);
        expect(next).toHaveBeenCalledWith();
        expect(req.log.debug).toHaveBeenCalledWith('Rate limiter hit: POST /v1/auth/login');
    });

    test('uses the normalized IP when no token or user key is available', () => {
        jestApi.resetModules();

        const rateLimit = jestApi.fn(() => jestApi.fn());
        rateLimit.ipKeyGenerator = jestApi.fn((ip) => `normalized:${ip}`);

        jestApi.doMock('express-rate-limit', () => ({
            rateLimit,
            ipKeyGenerator: rateLimit.ipKeyGenerator
        }));
        jestApi.doMock('#src/constants/index.js', () => ({
            keyGeneratorsKeys: {
                IP: 'ip',
                ANONYMOUS_ACCOUNT: 'anonymousAccount',
                TOKEN: 'token',
                QUERY_TOKEN: 'queryToken',
                USER: 'user'
            },
            rateLimitConfig: {
                v1: {
                    'v1/auth/refresh': {
                        windowMs: 900000,
                        limit: 5,
                        keyGenerator: 'token'
                    }
                }
            }
        }));

        require('../../../src/middlewares/rateLimiter.middleware');
        const keyGenerator = rateLimit.mock.calls[0][0].keyGenerator;

        expect(keyGenerator({
            headers: {},
            ip: '2001:db8::1'
        })).toBe('normalized:2001:db8::1');
    });
});
