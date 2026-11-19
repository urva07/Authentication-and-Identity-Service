const createProfileCacheRepository = require('./profileCache.repository');
const createUserExistenceRepository = require('./userExistence.repository'); 


let repositories;

const configureRepositories = (redisCacheClient) => {
    if (!redisCacheClient) {
        throw new TypeError('Redis repositories require a cache client');
    }

    repositories = {
        profileCacheRepository: createProfileCacheRepository(redisCacheClient),
        userExistenceRepository: createUserExistenceRepository(redisCacheClient)
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

const getprofileCacheRepository = () => getRepository('profileCacheRepository');
const getUserExistenceRepository = () => getRepository('userExistenceRepository');


module.exports = {
    configureRepositories,
    getprofileCacheRepository,
    getUserExistenceRepository
};