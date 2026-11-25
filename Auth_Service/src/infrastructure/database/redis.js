const { createClient } = require('redis');
const IORedis = require('ioredis');
const logger = require('#src/utils/logger.js');
const config = require('#src/config/config/index.js');


const { 
    host: sessionHost, 
    port: sessionPort, 
    username: sessionUsername, 
    password: sessionPassword, 
    database: sessionDatabase 
} = config.database.redis.sessionRedis;

const { 
    host: cacheHost, 
    port: cachePort, 
    username: cacheUsername, 
    password: cachePassword, 
    database: cacheDatabase 
} = config.database.redis.userCacheRedis;

const { 
    host: rateLimitHost, 
    port: rateLimitPort, 
    username: rateLimitUsername, 
    password: rateLimitPassword, 
    database: rateLimitDatabase 
} = config.database.redis.rateLimitRedis;

const { 
    host: bullMQHost,
    port: bullMQPort,
    username: bullMQUsername,
    password: bullMQPassword,
    db: bullMQDb,
    tls: bullMQTls,
    maxRetriesPerRequest: bullMQMaxRetriesPerRequest,
    enableReadyCheck: bullMQEnableReadyCheck
} = config.database.redis.bullMQRedis;

if (!sessionHost || !sessionPort) {
    throw new Error('Redis session configuration is incomplete. Set REDIS_HOST and REDIS_PORT for session Redis.');
}
if (!cacheHost || !cachePort) {
    throw new Error('Redis cache configuration is incomplete. Set REDIS_HOST and REDIS_PORT for cache Redis.');
}
if (!rateLimitHost || !rateLimitPort) {
    throw new Error('Redis rate limiter configuration is incomplete. Set REDIS_HOST and REDIS_PORT for rate limiter Redis.');
}
if (!bullMQHost || !bullMQPort) {
    throw new Error('Redis bullMQ configuration is incomplete. Set REDIS_HOST and REDIS_PORT for bullMQ Redis.');
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

const createRedisBullMQClient = () => new IORedis({
    host: bullMQHost,
    port: bullMQPort,
    username: bullMQUsername,
    password: bullMQPassword,
    db: bullMQDb,
    tls: bullMQTls,
    maxRetriesPerRequest: bullMQMaxRetriesPerRequest,
    enableReadyCheck: bullMQEnableReadyCheck
});

const redisBullMQClient = createRedisBullMQClient();

redisBullMQClient.on('ready', () => {
    logger.info('Bull MQ Redis connection ready');
});

redisBullMQClient.on('error', (error) => {
    logger.error(
        { err: error },
        'Bull MQ Redis connection error'
    );
});

const connectRedis = async () => {
    await redisSessionClient.connect();
    logger.info('Redis session client connected');

    await redisCacheClient.connect();
    logger.info('Redis cache client connected');

    await redisRateLimiterClient.connect();
    logger.info('Redis rate limiter client connected');

    await redisBullMQClient.ping();
    logger.info('Redis bullMQ client connected');

    logger.info('All Redis clients connected');
};


module.exports = {
    connectRedis,
    redisClients: {
        redisSessionClient,
        redisCacheClient,
        redisRateLimiterClient,
        redisBullMQClient
    }
};