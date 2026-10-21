const createIdentityProviderRepository = (IdentityProvider) => ({
    create: (attributes, options = {}) => IdentityProvider.create(attributes, options),
    findByProviderIdentity: (provider, providerUserId, options = {}) =>
        IdentityProvider.findOne({
            where: { provider, providerUserId },
            ...options
        }),
    findAllByUserId: (userId, options = {}) =>
        IdentityProvider.findAll({
            where: { userId },
            ...options
        }),
    deleteByProviderIdentity: (provider, providerUserId, options = {}) =>
        IdentityProvider.destroy({
            where: { provider, providerUserId },
            ...options
        })
});

module.exports = createIdentityProviderRepository;
