const { connectMySQL, sequelize, models } = require('./mysql');
const { connectRedis, redisClients } = require('./redis.js');
// const connectMongo = require('./mongo');

const initializeConnections = async () => {
    const [mysql, redis] = await Promise.all([
        connectMySQL(),
        connectRedis(),
        // connectMongo()
    ]);

    return { mysql, redis };
};

module.exports = { 
    initializeConnections,
    dbs: {
        mysql: {
            sequelize,
            models
        },
        redis: {
            ...redisClients
        }
    }
};