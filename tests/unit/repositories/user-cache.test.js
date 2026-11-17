const { describe, expect, jest: jestApi, test } = require('@jest/globals');
const createUserCacheRepository = require('../../../src/repositories/redis/userCache/userCache.repository');

describe('user cache repository', () => {
    test('reads and parses a cached user or returns null on a miss', async () => {
        const redis = { get: jestApi.fn().mockResolvedValueOnce('{"id":"u1"}').mockResolvedValueOnce(null) };
        const cache = createUserCacheRepository(redis);

        await expect(cache.getById('u1')).resolves.toEqual({ id: 'u1' });
        await expect(cache.getById('missing')).resolves.toBeNull();
        expect(redis.get).toHaveBeenNthCalledWith(1, 'user:u1');
        expect(redis.get).toHaveBeenNthCalledWith(2, 'user:missing');
    });

    test('writes serialized users with a TTL and invalidates by id', async () => {
        const redis = { set: jestApi.fn(), del: jestApi.fn() };
        const cache = createUserCacheRepository(redis);

        await cache.setById('u1', { id: 'u1' }, 60);
        await cache.invalidateById('u1');

        expect(redis.set).toHaveBeenCalledWith('user:u1', '{"id":"u1"}', { EX: 60 });
        expect(redis.del).toHaveBeenCalledWith('user:u1');
    });
});