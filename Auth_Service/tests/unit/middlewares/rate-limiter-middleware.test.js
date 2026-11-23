const {
    describe,
    test,
    expect,
    jest: jestApi
} = require('@jest/globals');

const keyGeneratorsKeys = {
    IP: 'ip',
    ANONYMOUS_ACCOUNT: 'anonymousAccount',
    TOKEN: 'token',
    QUERY_TOKEN: 'queryToken',
    USER: 'user'
};

const rateLimitConfig = {
    v1: {
        '/v1/auth/login': {
            windowMs: 900000,
            limit: 5,
            keyGenerator: keyGeneratorsKeys.ANONYMOUS_ACCOUNT
        },
        '/v1/auth/refresh': {
            windowMs: 900000,
            limit: 5,
            keyGenerator: keyGeneratorsKeys.TOKEN
        },
        '/v1/auth/logout': {
            windowMs: 900000,
            limit: 5,
            keyGenerator: keyGeneratorsKeys.USER
        },
        '/v1/auth/reset-password': {
            windowMs: 900000,
            limit: 5,
            keyGenerator: keyGeneratorsKeys.QUERY_TOKEN
        }
    }
};

const loadMiddleware = () => {
    jestApi.resetModules();

    const sendCommand = jestApi.fn(async (...args) => (
        args.length === 1 && Array.isArray(args[0]) ? args[0] : args
    ));
    const redisRateLimiterClient = { sendCommand };
    const limiter = jestApi.fn((req, res, next) => next());
    const rateLimit = jestApi.fn(() => limiter);
    const ipKeyGenerator = jestApi.fn((ip) => `normalized:${ip}`);
    const redisStoreOptions = [];

    class RedisStore {
        constructor(options) {
            this.options = options;
            redisStoreOptions.push(options);
        }
    }

    jestApi.doMock('express-rate-limit', () => ({
        rateLimit,
        ipKeyGenerator
    }));
    jestApi.doMock('rate-limit-redis', () => ({ RedisStore }));
    jestApi.doMock('#src/constants/index.js', () => ({
        keyGeneratorsKeys,
        rateLimitConfig
    }));
    jestApi.doMock('#src/infrastructure/database/index.js', () => ({
        dbs: {
            redis: {
                redisRateLimiterClient
            }
        }
    }));

    const middleware = require('../../../src/middlewares/rateLimiter.middleware');

    return {
        middleware,
        limiter,
        rateLimit,
        ipKeyGenerator,
        redisRateLimiterClient,
        redisStoreOptions
    };
};

const createRequest = (overrides = {}) => {
    const path = overrides.path || '/v1/auth/login';
    return {
        path,
        originalUrl: overrides.originalUrl || path,
        method: 'POST',
        ip: '2001:db8:1234:5678::1',
        body: {},
        headers: {},
        query: {},
        log: { debug: jestApi.fn() },
        ...overrides
    };
};

describe('rate limiter middleware', () => {
    test('does not derive limiters while the module is imported', () => {
        const { rateLimit } = loadMiddleware();

        expect(rateLimit).not.toHaveBeenCalled();
    });

    test('createDerivedLimiter creates one Redis-backed limiter per configured route', () => {
        const {
            middleware,
            rateLimit,
            redisStoreOptions
        } = loadMiddleware();

        middleware.createDerivedLimiter();

        expect(rateLimit).toHaveBeenCalledTimes(4);
        expect(redisStoreOptions).toHaveLength(4);
        expect(redisStoreOptions.map(({ prefix }) => prefix)).toEqual([
            'rate-limit:/v1/auth/login:',
            'rate-limit:/v1/auth/refresh:',
            'rate-limit:/v1/auth/logout:',
            'rate-limit:/v1/auth/reset-password:'
        ]);
    });

    test('runs the matching derived limiter and logs the hit', () => {
        const { middleware, limiter } = loadMiddleware();
        middleware.createDerivedLimiter();

        const req = createRequest();
        const res = {};
        const next = jestApi.fn();

        middleware.dynamicRateLimiter(req, res, next);

        expect(limiter).toHaveBeenCalledWith(req, res, next);
        expect(req.log.debug).toHaveBeenCalledWith(
            'Derived Rate limiter hit for: POST /v1/auth/login'
        );
        expect(next).toHaveBeenCalledWith();
    });

    test('calls next and logs when no derived limiter matches', () => {
        const { middleware } = loadMiddleware();
        middleware.createDerivedLimiter();

        const req = createRequest({ path: '/v1/auth/not-configured' });
        const next = jestApi.fn();

        middleware.dynamicRateLimiter(req, {}, next);

        expect(req.log.debug).toHaveBeenCalledWith(
            'No Derived Rate limiter hit for: POST /v1/auth/not-configured'
        );
        expect(next).toHaveBeenCalledWith();
    });

    test('uses the normalized IP for anonymous-account fallback', () => {
        const { middleware, rateLimit, ipKeyGenerator } = loadMiddleware();
        middleware.createDerivedLimiter();

        const loginOptions = rateLimit.mock.calls.find(
            ([options]) => options.store.options.prefix === 'rate-limit:/v1/auth/login:'
        )[0];
        const key = loginOptions.keyGenerator(createRequest());

        expect(ipKeyGenerator).toHaveBeenCalledWith('2001:db8:1234:5678::1');
        expect(key).toBe('normalized:2001:db8:1234:5678::1');
    });

    test('uses a bearer token instead of IP for token key generation', () => {
        const { middleware, rateLimit } = loadMiddleware();
        middleware.createDerivedLimiter();

        const refreshOptions = rateLimit.mock.calls.find(
            ([options]) => options.store.options.prefix === 'rate-limit:/v1/auth/refresh:'
        )[0];

        expect(refreshOptions.keyGenerator(createRequest({
            headers: { authorization: 'Bearer access-token' }
        }))).toBe('token:Bearer access-token');
    });

    test('falls back to the normalized IP for missing token, query token, and user identifiers', () => {
        const { middleware, rateLimit, ipKeyGenerator } = loadMiddleware();
        middleware.createDerivedLimiter();

        const getOptions = (prefix) => rateLimit.mock.calls.find(
            ([options]) => options.store.options.prefix === prefix
        )[0];

        expect(getOptions('rate-limit:/v1/auth/refresh:')
            .keyGenerator(createRequest())).toBe(
            'normalized:2001:db8:1234:5678::1'
        );
        expect(getOptions('rate-limit:/v1/auth/reset-password:')
            .keyGenerator(createRequest())).toBe(
            'normalized:2001:db8:1234:5678::1'
        );
        expect(getOptions('rate-limit:/v1/auth/logout:')
            .keyGenerator(createRequest())).toBe(
            'normalized:2001:db8:1234:5678::1'
        );
        expect(ipKeyGenerator).toHaveBeenCalledTimes(3);
    });

    test('forwards Redis store commands to the configured rate-limit client', async () => {
        const {
            middleware,
            redisStoreOptions,
            redisRateLimiterClient
        } = loadMiddleware();
        middleware.createDerivedLimiter();

        const result = await redisStoreOptions[0].sendCommand(
            'EVALSHA',
            'script',
            '1',
            'rate-limit:/v1/auth/login:key'
        );

        expect(redisRateLimiterClient.sendCommand).toHaveBeenCalledWith([
            'EVALSHA',
            'script',
            '1',
            'rate-limit:/v1/auth/login:key'
        ]);
        expect(result).toEqual([
            'EVALSHA',
            'script',
            '1',
            'rate-limit:/v1/auth/login:key'
        ]);
    });
});
