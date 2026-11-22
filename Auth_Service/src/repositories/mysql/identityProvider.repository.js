const createIdentityProviderRepository = ({ 
    IdentityProvider,
    createQueryLogger
}) => ({
    create: (
        attributes, 
        options = {}
    ) => IdentityProvider.create(attributes, {
        benchmark: true,
        logging: createQueryLogger('create', 'IdentityProvider'),
        ...options
    }),
    findByProviderIdentity: (
        provider, 
        providerUserId, 
        options = {}
    ) => IdentityProvider.findOne({
        benchmark: true,
        logging: createQueryLogger('findByProviderIdentity', 'IdentityProvider'),
        where: { provider, providerUserId },
        ...options
    }),
    findAllByUserId: (
        userId, 
        options = {}
    ) => IdentityProvider.findAll({
        benchmark: true,
        logging: createQueryLogger('findAllByUserId', 'IdentityProvider'),
        where: { userId },
        ...options
    }),
    deleteByProviderIdentity: (
        provider, 
        providerUserId, 
        options = {}
    ) => IdentityProvider.destroy({
        benchmark: true,
        logging: createQueryLogger('deleteByProviderIdentity', 'IdentityProvider'),
        where: { provider, providerUserId },
        ...options
    })
});


module.exports = createIdentityProviderRepository;