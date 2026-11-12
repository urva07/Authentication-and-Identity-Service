const { createClient } = require('redis');
const logger = require('#src/utils/logger.js');
const config = require('#src/config/config.js');


const { 
    host: sessionHost, 
    port: sessionPort, 
    username: sessionUsername, 
    password: sessionPassword, 
    database: sessionDatabase 
} = config.redis.sessionRedis;

const { 
    host: cacheHost, 
    port: cachePort, 
    username: cacheUsername, 
    password: cachePassword, 
    database: cacheDatabase 
} = config.redis.userCacheRedis;

const { 
    host: rateLimitHost, 
    port: rateLimitPort, 
    username: rateLimitUsername, 
    password: rateLimitPassword, 
    database: rateLimitDatabase 
} = config.redis.rateLimitRedis;

if (!sessionHost || !sessionPort) {
    throw new Error('Redis session configuration is incomplete. Set REDIS_HOST and REDIS_PORT for session.');
}
if (!cacheHost || !cachePort) {
    throw new Error('Redis cache configuration is incomplete. Set REDIS_HOST and REDIS_PORT for cache.');
}
if (!rateLimitHost || !rateLimitPort) {
    throw new Error('Redis rate limiter configuration is incomplete. Set REDIS_HOST and REDIS_PORT for rate limiter.');
}

const reconnectStrategy = (retries, cause) => {
    if (retries >= 5) {
        return new Error(`Redis reconnect limit reached: ${cause.message}`);
    }

    return Math.min(250 * 2 ** retries, 3000);
};

const redisSessionClient = createClient({
    socket: { host: sessionHost, port: sessionPort, reconnectStrategy },
    database: sessionDatabase,
    ...(sessionUsername ? { username: sessionUsername } : {}),
    ...(sessionPassword ? { password: sessionPassword } : {})
});

redisSessionClient.on('error', (error) => {
    logger.error({ err: error }, 'Redis client error');
});

const redisCacheClient = createClient({
    socket: { host: cacheHost, port: cachePort, reconnectStrategy },
    database: cacheDatabase,
    ...(cacheUsername ? { username: cacheUsername } : {}),
    ...(cachePassword ? { password: cachePassword } : {})
});

redisCacheClient.on('error', (error) => {
    logger.error({ err: error }, 'Redis cache client error');
}); 

const redisRateLimiterClient = createClient({
    socket: { host: rateLimitHost, port: rateLimitPort, reconnectStrategy },
    database: rateLimitDatabase,
    ...(rateLimitUsername ? { username: rateLimitUsername } : {}),
    ...(rateLimitPassword ? { password: rateLimitPassword } : {})
});

redisRateLimiterClient.on('error', (error) => {
    logger.error({ err: error }, 'Redis rate limiter client error');
});

const connectRedis = async () => {
    await redisSessionClient.connect();
    logger.info('Redis session client connected');

    await redisCacheClient.connect();
    logger.info('Redis cache client connected');

    await redisRateLimiterClient.connect();
    logger.info('Redis rate limiter client connected');

    logger.info('All Redis clients connected');
};


module.exports = {
    connectRedis,
    redisClients: {
        redisSessionClient,
        redisCacheClient,
        redisRateLimiterClient
    }
};