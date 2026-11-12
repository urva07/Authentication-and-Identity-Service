const createUserCacheRepository = (redis) => ({
    get: async (userId) => {
        const data = await redis.get(`user:${userId}`);

        return data ? JSON.parse(data) : null;
    },
    set: async (userId, user, ttl = 300) => {
        await redis.set(
            `user:${userId}`,
            JSON.stringify(user),
            { EX: ttl }
        );
    },
    invalidate: async (userId) => {
        await redis.del(`user:${userId}`);
    }
});


module.exports = createUserCacheRepository;