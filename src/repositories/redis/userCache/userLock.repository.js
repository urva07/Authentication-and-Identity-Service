const createUserLockRepository = (redis) => ({
    acquire: async (userId, token, ttl = 3600) => {
        return redis.set(
            `lock:user:${userId}`,
            token,
            { NX: true, PX: ttl }
        );
    },
    release: async (userId, token) => {
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
    }
});


module.exports = createUserLockRepository;