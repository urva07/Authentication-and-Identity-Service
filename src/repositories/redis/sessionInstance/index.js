const createUserLockRepository = require('./userLock.repository');


let repositories;

const configureRepositories = (redisClient) => {
    if (!redisClient) {
        throw new TypeError('Redis repositories require a cache client');
    }

    repositories = {
        userLockRepository: createUserLockRepository(redisClient),
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

const getUserLockRepository = () => getRepository('userLockRepository');


module.exports = {
    configureRepositories,
    getUserLockRepository
}