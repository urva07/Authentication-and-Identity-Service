const {
    describe,
    test,
    expect,
    jest: jestApi
} = require('@jest/globals');

describe('startup initializations', () => {
    test('waits for Redis connection before deriving Redis-backed limiters', async () => {
        jestApi.resetModules();

        const initializeConnections = jestApi.fn(async () => ({
            mysql: {},
            redis: {}
        }));
        const configureMysqlRepositories = jestApi.fn();
        const configureRedisInstancesRepositories = jestApi.fn();
        const createDerivedLimiter = jestApi.fn();

        jestApi.doMock('#src/infrastructure/database/index.js', () => ({
            initializeConnections,
            dbs: {
                mysql: { models: { User: {} } },
                redis: {
                    redisCacheClient: { name: 'cache' },
                    redisSessionClient: { name: 'session' }
                }
            }
        }));
        jestApi.doMock('#src/repositories/index.js', () => ({
            mysql: {
                configureRepositories: configureMysqlRepositories
            },
            redis: {
                configureAllInstanceRepositories: configureRedisInstancesRepositories
            }
        }));
        jestApi.doMock('#src/middlewares/rateLimiter.middleware.js', () => ({
            createDerivedLimiter
        }));

        const initialize = require('../../../src/lib/startupInitializations');

        await initialize();

        expect(initializeConnections).toHaveBeenCalledWith();
        expect(configureMysqlRepositories).toHaveBeenCalledWith(
            expect.any(Object)
        );
        expect(configureRedisInstancesRepositories).toHaveBeenCalledWith({
            userCacheInstanceClient: { name: 'cache' },
            sessionInstanceClient: { name: 'session' }
        });
        expect(createDerivedLimiter).toHaveBeenCalledWith();
        expect(initializeConnections.mock.invocationCallOrder[0])
            .toBeLessThan(createDerivedLimiter.mock.invocationCallOrder[0]);
    });
});
