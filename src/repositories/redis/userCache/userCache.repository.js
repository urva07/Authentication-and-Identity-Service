const createUserCacheRepository = (redis) => ({
    getById: async (userId) => {
        const data = await redis.get(`user:${userId}`);
        return data ? JSON.parse(data) : null;
    },
    setById: async (userId, user, ttl = 300) => {
        await redis.set(
            `user:${userId}`,
            JSON.stringify(user),
            { EX: ttl }
        );
    },
    invalidateById: async (userId) => {
        await redis.del(`user:${userId}`);
    }
});


module.exports = createUserCacheRepository;