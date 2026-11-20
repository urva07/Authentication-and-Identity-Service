const getKey = (userId) => `profile:${userId}`;
const { REDIS_CONSTANTS } = require('#src/constants/index.js');

const createProfileCacheRepository = (redis) => ({
    getById: async (userId) => {
        const data = await redis.get(getKey(userId));
        return data ? JSON.parse(data) : null;
    },
    setById: async (
        userId,
        user,
        ttl = REDIS_CONSTANTS.USER_CACHE_TTL_SECONDS
    ) => {
        await redis.set(
            getKey(userId),
            JSON.stringify(user),
            { EX: ttl }
        );
    },
    invalidateById: async (userId) => {
        await redis.del(getKey(userId));
    }
});


module.exports = createProfileCacheRepository;