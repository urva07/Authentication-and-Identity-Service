const { describe, expect, jest: jestApi, test } = require('@jest/globals');
const createProfileCacheRepository = require('../../../src/repositories/redis/userCacheInstance/profileCache.repository');
const createUserExistenceRepository = require('../../../src/repositories/redis/userCacheInstance/userExistence.repository');
const createUserLockRepository = require('../../../src/repositories/redis/sessionInstance/userLock.repository');

describe('profile cache repository', () => {
    test('reads and parses a cached profile or returns null on a miss', async () => {
        const redis = { get: jestApi.fn().mockResolvedValueOnce('{"id":"u1"}').mockResolvedValueOnce(null) };
        const cache = createProfileCacheRepository(redis);

        await expect(cache.getById('u1')).resolves.toEqual({ id: 'u1' });
        await expect(cache.getById('missing')).resolves.toBeNull();
        expect(redis.get).toHaveBeenNthCalledWith(1, 'profile:u1');
        expect(redis.get).toHaveBeenNthCalledWith(2, 'profile:missing');
    });

    test('writes serialized profiles with a TTL and invalidates by id', async () => {
        const redis = { set: jestApi.fn(), del: jestApi.fn() };
        const cache = createProfileCacheRepository(redis);

        await cache.setById('u1', { id: 'u1' }, 60);
        await cache.invalidateById('u1');

        expect(redis.set).toHaveBeenCalledWith('profile:u1', '{"id":"u1"}', { EX: 60 });
        expect(redis.del).toHaveBeenCalledWith('profile:u1');
    });
});

describe('user existence repository', () => {
    test('reads a cached existence value or returns null on a miss', async () => {
        const redis = {
            get: jestApi.fn()
                .mockResolvedValueOnce('1')
                .mockResolvedValueOnce(null)
        };
        const cache = createUserExistenceRepository(redis);

        await expect(cache.getById('u1')).resolves.toBe(1);
        await expect(cache.getById('missing')).resolves.toBeNull();
        expect(redis.get).toHaveBeenNthCalledWith(1, 'userExistence:u1');
        expect(redis.get).toHaveBeenNthCalledWith(2, 'userExistence:missing');
    });

    test('writes existence with a TTL and deletes it by id', async () => {
        const redis = { set: jestApi.fn(), del: jestApi.fn() };
        const cache = createUserExistenceRepository(redis);

        await cache.setById('u1');
        await cache.deleteById('u1');

        expect(redis.set).toHaveBeenCalledWith(
            'userExistence:u1',
            '1',
            { EX: 300 }
        );
        expect(redis.del).toHaveBeenCalledWith('userExistence:u1');
    });
});

describe('session user lock repository', () => {
    test('acquires and detects a user lock', async () => {
        const redis = {
            set: jestApi.fn().mockResolvedValue('OK'),
            get: jestApi.fn().mockResolvedValue('cache-token')
        };
        const lock = createUserLockRepository(redis);

        await expect(lock.acquire('u1', 'cache-token')).resolves.toBe('OK');
        await expect(lock.isLocked('u1')).resolves.toBe(true);

        expect(redis.set).toHaveBeenCalledWith(
            'lock:user:u1',
            'cache-token',
            { NX: true, EX: 60 }
        );
        expect(redis.get).toHaveBeenCalledWith('lock:user:u1');
    });

    test('reports an unlocked user and releases only the owning token', async () => {
        const redis = {
            get: jestApi.fn().mockResolvedValue(null),
            eval: jestApi.fn().mockResolvedValue(1)
        };
        const lock = createUserLockRepository(redis);

        await expect(lock.isLocked('u1')).resolves.toBe(false);
        await expect(lock.release('u1', 'cache-token')).resolves.toBe(1);

        expect(redis.eval).toHaveBeenCalledWith(
            expect.stringContaining('redis.call("GET", KEYS[1])'),
            {
                keys: ['lock:user:u1'],
                arguments: ['cache-token']
            }
        );
    });
});