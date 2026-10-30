const connectMySQL = require('./mysql');
const connectRedis = require('#src/infrastructure/caching/redis.js');
// const connectMongo = require('./mongo');

const initializeConnections = async () => {
    const [mysql, redis] = await Promise.all([
        connectMySQL(),
        connectRedis(),
        // connectMongo()
    ]);

    return { mysql, redis };
};

module.exports = initializeConnections;