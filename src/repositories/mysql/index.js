const createUserRepository = require('./user.repository');
const createUserPasswordRepository = require('./userPassword.repository');
const createIdentityProviderRepository = require('./identityProvider.repository');
const createActiveTokenRepository = require('./activeToken.repository');
const { createQueryLogger } = require('#src/monitoring/index.js');


let repositories;

const configureRepositories = (models) => {
    repositories = {
        userRepository: createUserRepository({
            User: models.User,
            UserPassword: models.UserPassword,
            IdentityProvider: models.IdentityProvider,
            createQueryLogger
        }),
        userPasswordRepository: createUserPasswordRepository({
            UserPassword: models.UserPassword,
            createQueryLogger
        }),
        identityProviderRepository: createIdentityProviderRepository({
            IdentityProvider: models.IdentityProvider,
            User: models.User,
            createQueryLogger
        }),
        activeTokenRepository: createActiveTokenRepository({
            ActiveToken: models.ActiveToken,
            createQueryLogger
        })
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
    activeTokenRepository: createActiveTokenRepository,
    configureRepositories,
    getUserRepository: () => getRepository('userRepository'),
    getUserPasswordRepository: () => getRepository('userPasswordRepository'),
    getIdentityProviderRepository: () => getRepository('identityProviderRepository'),
    getActiveTokenRepository: () => getRepository('activeTokenRepository')
};