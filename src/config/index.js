const connectMySQL = require('./mysql');
const connectRedis = require('./redis');

const initializeConnections = async () => {
    const [mysql, redis] = await Promise.all([
        connectMySQL(),
        connectRedis()
    ]);

    return { mysql, redis };
};

module.exports = initializeConnections;