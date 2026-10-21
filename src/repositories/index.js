const createUserRepository = require('./user.repository');
const createUserPasswordRepository = require('./user-password.repository');
const createIdentityProviderRepository = require('./identity-provider.repository');

let repositories;

const configureRepositories = (models) => {
    repositories = {
        userRepository: createUserRepository(models.User),
        userPasswordRepository: createUserPasswordRepository(models.UserPassword),
        identityProviderRepository: createIdentityProviderRepository(models.IdentityProvider)
    };
};

const getRepository = (name) => {
    if (!repositories) {
        throw new Error('Repositories have not been configured');
    }

    return repositories[name];
};

module.exports = {
    userRepository: createUserRepository,
    userPasswordRepository: createUserPasswordRepository,
    identityProviderRepository: createIdentityProviderRepository,
    configureRepositories,
    getUserRepository: () => getRepository('userRepository'),
    getUserPasswordRepository: () => getRepository('userPasswordRepository'),
    getIdentityProviderRepository: () => getRepository('identityProviderRepository')
};
