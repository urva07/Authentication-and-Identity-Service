const { createClient } = require('redis');
const logger = require('#src/utils/logger.js');
const config = require('#src/config/config.js');

const connectRedis = async () => {
    const { host, port, username, password, database } = config.redis;

    if (!host) {
        throw new Error('Redis configuration is incomplete. Set REDIS_HOST.');
    }

    const client = createClient({
        socket: { host, port },
        database,
        ...(username ? { username } : {}),
        ...(password ? { password } : {})
    });
    client.on('error', (error) => {
        logger.error({ err: error }, 'Redis client error');
    });

    await client.connect();
    logger.info('Redis connected');
    return client;
};

module.exports = connectRedis;