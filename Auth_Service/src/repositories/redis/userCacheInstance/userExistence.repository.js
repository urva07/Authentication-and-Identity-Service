const getKey = (userId) => `userExistence:${userId}`;
const { REDIS_CONSTANTS } = require('#src/constants/index.js');

const createUserExistenceRepository = (redis) => ({
    getById: async (userId) => {
        const data = await redis.get(getKey(userId));
        return data ? JSON.parse(data) : null;
    },
    setById: async (
        userId,
        value = 1,
        ttl = REDIS_CONSTANTS.USER_CACHE_TTL_SECONDS
    ) => {
        await redis.set(
            getKey(userId),
            JSON.stringify(value),
            { EX: ttl }
        );
    },
    deleteById: async (userId) => {
        await redis.del(getKey(userId));
    }
});


module.exports = createUserExistenceRepository;