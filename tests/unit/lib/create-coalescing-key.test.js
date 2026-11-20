const { describe, expect, test } = require('@jest/globals');
const createCoalescingKey = require('../../../src/lib/createCoalescingKey');
const { COALESCING } = require('../../../src/constants');

describe('createCoalescingKey', () => {
    test('creates stable keys for equivalent arguments', () => {
        const key = createCoalescingKey({ db: 'MySQL', repository: 'UserRepository', method: 'findById' });

        expect(key([{ b: 2, a: 1 }])).toBe(key([{ a: 1, b: 2 }]));
        expect(key(['a'])).not.toBe(key(['b']));
    });

    test('preserves case-sensitive argument values', () => {
        const key = createCoalescingKey({
            db: 'mysql', repository: 'identityProviderRepository', method: 'findByProviderIdentity'
        });

        expect(key(['google', 'ProviderUserID'])).not.toBe(key(['google', 'provideruserid']));
    });

    test('distinguishes Redis instances from other databases', () => {
        const redisKey = createCoalescingKey({
            db: 'redis', redisInstance: 'userCacheInstance', repository: 'userRepository', method: 'findById'
        });
        const mysqlKey = createCoalescingKey({ db: 'mysql', repository: 'userRepository', method: 'findById' });

        expect(redisKey(['id'])).not.toBe(mysqlKey(['id']));
    });

    test('supports the session Redis instance and distinguishes it from the user cache', () => {
        const sessionKey = createCoalescingKey({
            db: 'redis', redisInstance: 'sessionInstance', repository: 'userLockRepository', method: 'isLocked'
        });
        const userCacheKey = createCoalescingKey({
            db: 'redis', redisInstance: 'userCacheInstance', repository: 'userLockRepository', method: 'isLocked'
        });

        expect(sessionKey(['user-id'])).not.toBe(userCacheKey(['user-id']));
    });

    test('defines MySQL and Redis repository method constants by repository', () => {
        expect(COALESCING.MYSQL.REPOSITORIES.USER).toBe('userRepository');
        expect(COALESCING.MYSQL.METHODS.USER.FIND_BY_EMAIL).toBe('findByEmail');
        expect(COALESCING.MYSQL.REPOSITORIES.ACTIVE_TOKEN).toBe('activeTokenRepository');
        expect(COALESCING.MYSQL.METHODS.ACTIVE_TOKEN.CONSUME).toBe('consume');

        expect(COALESCING.REDIS_INSTANCES.USER_CACHE).toBe('userCacheInstance');
        expect(
            COALESCING.REDIS.USER_CACHE_INSTANCE.REPOSITORIES.PROFILE_CACHE
        ).toBe('profileCacheRepository');
        expect(
            COALESCING.REDIS.USER_CACHE_INSTANCE.METHODS.PROFILE_CACHE.INVALIDATE_BY_ID
        ).toBe('invalidateById');
        expect(
            COALESCING.REDIS.SESSION_INSTANCE.REPOSITORIES.USER_LOCK
        ).toBe('userLockRepository');
        expect(
            COALESCING.REDIS.SESSION_INSTANCE.METHODS.USER_LOCK.IS_LOCKED
        ).toBe('isLocked');
        expect(COALESCING.REDIS_INSTANCES.RATE_LIMIT).toBe('rateLimitInstance');
    });

    test('rejects invalid configuration and arguments', () => {
        expect(() => createCoalescingKey({ db: 'redis', repository: 'users', method: 'get' })).toThrow();
        expect(() => createCoalescingKey({ db: 'unknown', repository: 'users', method: 'get' })).toThrow();
        const key = createCoalescingKey({ db: 'mysql', repository: 'users', method: 'get' });
        expect(() => key('id')).toThrow();
        expect(() => key([undefined])).toThrow();
    });
});
