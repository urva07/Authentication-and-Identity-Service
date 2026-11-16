const createUserLockRepository = (redis) => ({
    acquire: async (userId, token, ttl = 60) => {
        // The token proves ownership: if this lock expires and another caller acquires 
        // it, the old caller cannot accidentally release the new caller's lock.
        return redis.set(
            `lock:user:${userId}`,
            token,
            { NX: true, EX: ttl }
        );
    },
    release: async (userId, token) => {
        // Only release the lock if the token matches, ensuring ownership.
        return redis.eval(
            `if redis.call("GET", KEYS[1]) == ARGV[1] then
                return redis.call("DEL", KEYS[1])
            end
            return 0`,
            {
                keys: [`lock:user:${userId}`],
                arguments: [token]
            }
        );
    },
    isLocked: async (userId) => {
        const result = await redis.get(`lock:user:${userId}`);
        return result !== null;
    }
});


module.exports = createUserLockRepository;