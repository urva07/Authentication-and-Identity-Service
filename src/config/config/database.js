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


module.exports = {
    mongo,
    mysql,
    redis
}