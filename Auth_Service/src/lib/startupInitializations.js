const { 
    initializeConnections, 
    dbs: { 
        mysql,
        redis,
    } 
} = require('#src/infrastructure/database/index.js');
const { 
    mysql: { 
        configureRepositories: configureMysqlRepositories 
    },
    redis: {
        configureAllInstanceRepositories: configureRedisInstancesRepositories
    }
} = require('#src/repositories/index.js');
const { createDerivedLimiter } = require('#src/middlewares/rateLimiter.middleware.js');


const initialize = async () => {
    connections = await initializeConnections();

    configureMysqlRepositories(mysql.models);
    configureRedisInstancesRepositories({
        userCacheInstanceClient: redis.redisCacheClient,
        sessionInstanceClient: redis.redisSessionClient
    });

    createDerivedLimiter()
}


module.exports = initialize;