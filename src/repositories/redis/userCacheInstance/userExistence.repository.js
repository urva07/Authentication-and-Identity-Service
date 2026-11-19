const getKey = (userId) => `userExistence:${userId}`;

const createUserExistenceRepository = (redis) => ({
    getById: async (userId) => {
        const data = await redis.get(getKey(userId));
        return data ? JSON.parse(data) : null;
    },
    setById: async (userId, value = 1, ttl = 300) => {
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