const IORedis = require('ioredis');
const { redis: redisConfig } = require('../config');


const createRedisConnection = () => {
    const connection = new IORedis({
        host: redisConfig.host,
        port: redisConfig.port,
        username: redisConfig.username || undefined,
        password: redisConfig.password || undefined,
        db: redisConfig.db,
        tls: redisConfig.tls ? {} : undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false
    });

    return connection;
};


module.exports = createRedisConnection;
