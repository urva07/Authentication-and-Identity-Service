const createUserCacheRepository = require('./userCache.repository');
const createUserLockRepository = require('./userLock.repository');


let repositories;

const configureRepositories = (redisCacheClient) => {
    if (!redisCacheClient) {
        throw new TypeError('Redis repositories require a cache client');
    }

    repositories = {
        userCacheRepository: createUserCacheRepository(redisCacheClient),
        userLockRepository: createUserLockRepository(redisCacheClient)
    };
}

const getRepository = (name) => {
    if (!repositories) {
        throw new Error('Redis repositories have not been configured');
    }

    if (!repositories[name]) {
        throw new Error(`Repository with name ${name} does not exist`);
    }

    return repositories[name];
}

const getUserCacheRepository = () => getRepository('userCacheRepository');
const getUserLockRepository = () => getRepository('userLockRepository');


module.exports = {
    configureRepositories,
    getUserCacheRepository,
    getUserLockRepository
};