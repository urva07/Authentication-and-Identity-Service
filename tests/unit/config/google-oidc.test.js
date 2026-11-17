const {
    describe,
    expect,
    jest: jestApi,
    test
} = require('@jest/globals');

jestApi.mock('#src/repositories/index.js', () => ({
    mysql: {
        getUserRepository: jestApi.fn(),
        getIdentityProviderRepository: jestApi.fn()
    }
}));

jestApi.mock('#src/infrastructure/database/index.js', () => ({
    dbs: { mysql: { sequelize: { transaction: jestApi.fn() } } }
}));

const { createGoogleOidcAuthenticationCallback } = require('../../../src/config/passport/googleOidc');

const profile = {
    id: 'google-id',
    name: { givenName: 'Urva', familyName: 'Patel' },
    emails: [{ value: 'urva@example.com' }]
};

const setup = ({ identity = null, dbUser } = {}) => {
    const transaction = { commit: jestApi.fn(), rollback: jestApi.fn() };
    const userRepository = {
        findByEmailOrCreate: jestApi.fn(async (email, defaults) => [dbUser || { id: defaults.id }, !dbUser])
    };
    const identityProviderRepository = {
        findByProviderIdentity: jestApi.fn().mockResolvedValue(identity),
        create: jestApi.fn().mockResolvedValue({})
    };
    const verify = createGoogleOidcAuthenticationCallback({
        userRepository,
        identityProviderRepository,
        mysqlSequelizeClient: { transaction: jestApi.fn().mockResolvedValue(transaction) }
    });
    const run = () => new Promise((resolve) => {
        verify('issuer', profile, (error, user) => resolve({ error, user }));
    });

    return { userRepository, identityProviderRepository, transaction, run };
};

describe('Google OIDC authentication callback', () => {
    test('links the identity to an existing user with the same email', async () => {
        const { userRepository, identityProviderRepository, transaction, run } = setup({
            dbUser: { id: 'existing-user-id' }
        });

        const { error, user } = await run();

        expect(error).toBeNull();
        expect(userRepository.findByEmailOrCreate).toHaveBeenCalledWith(
            'urva@example.com',
            expect.objectContaining({ firstName: 'Urva', lastName: 'Patel' }),
            { transaction }
        );
        expect(identityProviderRepository.create).toHaveBeenCalledWith(
            { userId: 'existing-user-id', provider: 'google', providerUserId: 'google-id' },
            { transaction }
        );
        expect(user.id).toBe('existing-user-id');
        expect(transaction.commit).toHaveBeenCalled();
    });

    test('creates a new user when the email is not registered', async () => {
        const { userRepository, identityProviderRepository, run } = setup();

        const { error, user } = await run();
        const [, defaults] = userRepository.findByEmailOrCreate.mock.calls[0];

        expect(error).toBeNull();
        expect(user.id).toBe(defaults.id);
        expect(identityProviderRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ userId: defaults.id }),
            expect.anything()
        );
    });

    test('skips user creation when the identity already exists', async () => {
        const { userRepository, run } = setup({ identity: { userId: 'linked-user-id' } });

        const { user } = await run();

        expect(userRepository.findByEmailOrCreate).not.toHaveBeenCalled();
        expect(user.id).toBe('linked-user-id');
    });
});
