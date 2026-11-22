const mongo = {
    username: process.env.MONGO_USERNAME,
    password: process.env.MONGO_PASSWORD,
    host: process.env.MONGO_HOST,
    port: Number(process.env.MONGO_PORT) || 27017,
    database: process.env.MONGO_DB_NAME,
    authSource: process.env.MONGO_AUTH_SOURCE || 'admin'
};

const mysql = {
    username: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT) || 3306,
    database: process.env.MYSQL_DATABASE
};

const redis = {
    sessionRedis: {
        host: process.env.SESSION_REDIS_HOST,
        port: Number(process.env.SESSION_REDIS_PORT) || 6379,
        username: process.env.SESSION_REDIS_USERNAME,
        password: process.env.SESSION_REDIS_PASSWORD,
        database: Number(process.env.SESSION_REDIS_DATABASE) || 0
    },
    userCacheRedis: {
        host: process.env.USER_CACHE_REDIS_HOST,
        port: Number(process.env.USER_CACHE_REDIS_PORT) || 6379,
        username: process.env.USER_CACHE_REDIS_USERNAME,
        password: process.env.USER_CACHE_REDIS_PASSWORD,
        database: Number(process.env.USER_CACHE_REDIS_DATABASE) || 0
    },
    rateLimitRedis: {
        host: process.env.RATE_LIMIT_REDIS_HOST,
        port: Number(process.env.RATE_LIMIT_REDIS_PORT) || 6379,
        username: process.env.RATE_LIMIT_REDIS_USERNAME,
        password: process.env.RATE_LIMIT_REDIS_PASSWORD,
        database: Number(process.env.RATE_LIMIT_REDIS_DATABASE) || 0
    }
};

const databaseConfig = {
    mongo,
    mysql,
    redis
};

const logger = require('#src/utils/logger.js');

const isMissing = (value) =>
    typeof value !== 'string' || value.trim().length === 0;

const isInvalidPort = (port) =>
    !Number.isInteger(port) || port < 1 || port > 65535;

const invalidConfigs = [];

if (
    isMissing(databaseConfig.mysql.username) ||
    isMissing(databaseConfig.mysql.password) ||
    isMissing(databaseConfig.mysql.host) ||
    isMissing(databaseConfig.mysql.database) ||
    isInvalidPort(databaseConfig.mysql.port)
) {
    invalidConfigs.push('MYSQL');
}

for (const [name, redisConfig] of [
    ['SESSION_REDIS', databaseConfig.redis.sessionRedis],
    ['USER_CACHE_REDIS', databaseConfig.redis.userCacheRedis],
    ['RATE_LIMIT_REDIS', databaseConfig.redis.rateLimitRedis]
]) {
    if (
        isMissing(redisConfig.host) ||
        isMissing(redisConfig.password) ||
        isInvalidPort(redisConfig.port)
    ) {
        invalidConfigs.push(name);
    }
}

if (invalidConfigs.length > 0) {
    logger.fatal(
        { invalidConfigs },
        'Critical database configuration is missing or invalid'
    );
    process.exit(1);
}

module.exports = databaseConfig;