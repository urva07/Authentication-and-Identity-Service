const logger = require('../utils/logger');

const redisConfig = {
    host: process.env.BULLMQ_REDIS_HOST || 'localhost',
    port: process.env.BULLMQ_REDIS_PORT === undefined
        ? 6379
        : Number(process.env.BULLMQ_REDIS_PORT),
    username: process.env.BULLMQ_REDIS_USERNAME,
    password: process.env.BULLMQ_REDIS_PASSWORD,
    db: process.env.BULLMQ_REDIS_DB === undefined
        ? 0
        : Number(process.env.BULLMQ_REDIS_DB),
    tls: process.env.BULLMQ_REDIS_TLS === 'true'
};

const invalidConfigs = [];

if (!Number.isInteger(redisConfig.port) || redisConfig.port < 1 || redisConfig.port > 65535) {
    invalidConfigs.push('BULLMQ_REDIS_PORT');
}
if (!Number.isInteger(redisConfig.db) || redisConfig.db < 0) {
    invalidConfigs.push('BULLMQ_REDIS_DB');
}

if (invalidConfigs.length > 0) {
    logger.fatal(
        { invalidConfigs },
        'Critical Redis configuration is missing or invalid'
    );
    process.exit(1);
}

module.exports = redisConfig;
