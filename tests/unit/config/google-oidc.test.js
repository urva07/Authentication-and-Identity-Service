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

const setup = ({
    identity = null,
    dbUser = {
        id: 'persisted-user-id',
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        email: profile.emails[0].value
    },
    identityCreateError = null
} = {}) => {
    const transaction = { commit: jestApi.fn(), rollback: jestApi.fn() };
    const userRepository = {
        createButIgnoreIfExists: jestApi.fn().mockResolvedValue(undefined),
        findByEmail: jestApi.fn().mockResolvedValue(dbUser),
        findById: jestApi.fn().mockResolvedValue(dbUser)
    };
    const identityProviderRepository = {
        findByProviderIdentity: jestApi.fn().mockResolvedValue(identity),
        create: identityCreateError
            ? jestApi.fn().mockRejectedValue(identityCreateError)
            : jestApi.fn().mockResolvedValue({})
    };
    const verify = createGoogleOidcAuthenticationCallback({
        userRepository,
        identityProviderRepository,
        mysqlSequelizeClient: { transaction: jestApi.fn().mockResolvedValue(transaction) }
    });
    const run = () => {
        let resolveResult;
        const result = new Promise((resolve) => {
            resolveResult = resolve;
        });
        const done = jestApi.fn((error, user) => resolveResult({ error, user }));

        verify('issuer', profile, done);
        return { done, result };
    };

    return { userRepository, identityProviderRepository, transaction, run };
};

describe('Google OIDC authentication callback', () => {
    test('creates or reuses the user, creates the identity, commits, and completes Passport', async () => {
        const { userRepository, identityProviderRepository, transaction, run } = setup();
        const { done, result } = run();

        const { error, user } = await result;

        expect(error).toBeNull();
        expect(user).toEqual(expect.objectContaining({ id: 'persisted-user-id' }));
        expect(userRepository.createButIgnoreIfExists).toHaveBeenCalledWith(
            expect.objectContaining({
                firstName: 'Urva',
                lastName: 'Patel',
                email: 'urva@example.com'
            }),
            { transaction }
        );
        expect(userRepository.findByEmail).toHaveBeenCalledWith(
            'urva@example.com',
            {
                attributes: ['id', 'email', 'firstName', 'lastName'],
                transaction
            }
        );
        expect(identityProviderRepository.create).toHaveBeenCalledWith(
            { userId: 'persisted-user-id', provider: 'google', providerUserId: 'google-id' },
            { transaction }
        );
        expect(transaction.commit).toHaveBeenCalledTimes(1);
        expect(done).toHaveBeenCalledTimes(1);
        expect(transaction.commit.mock.invocationCallOrder[0]).toBeLessThan(
            done.mock.invocationCallOrder[0]
        );
    });

    test('reuses the existing user when the Google identity already exists', async () => {
        const { userRepository, identityProviderRepository, transaction, run } = setup({
            identity: { userId: 'linked-user-id' },
            dbUser: { id: 'linked-user-id', email: 'urva@example.com' }
        });
        const { done, result } = run();

        const { error, user } = await result;

        expect(error).toBeNull();
        expect(user.id).toBe('linked-user-id');
        expect(userRepository.findById).toHaveBeenCalledWith(
            'linked-user-id',
            { attributes: ['id', 'email', 'firstName', 'lastName'] }
        );
        expect(userRepository.createButIgnoreIfExists).not.toHaveBeenCalled();
        expect(identityProviderRepository.create).not.toHaveBeenCalled();
        expect(transaction.commit).not.toHaveBeenCalled();
        expect(done).toHaveBeenCalledTimes(1);
    });

    test('treats a concurrent identity insert as already linked and completes Passport', async () => {
        const duplicateError = new Error('Duplicate identity');
        duplicateError.name = 'SequelizeUniqueConstraintError';
        const { identityProviderRepository, transaction, run } = setup({
            identityCreateError: duplicateError
        });
        const { done, result } = run();

        const { error, user } = await result;

        expect(error).toBeNull();
        expect(user.id).toBe('persisted-user-id');
        expect(identityProviderRepository.create).toHaveBeenCalled();
        expect(transaction.rollback).toHaveBeenCalledTimes(1);
        expect(transaction.commit).not.toHaveBeenCalled();
        expect(done).toHaveBeenCalledTimes(1);
    });
});
