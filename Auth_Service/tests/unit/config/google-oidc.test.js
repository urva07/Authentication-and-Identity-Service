const {
    afterEach,
    describe,
    expect,
    jest: jestApi,
    test
} = require('@jest/globals');

jestApi.mock('#src/repositories/index.js', () => ({
    mysql: {
        getUserRepository: jestApi.fn(),
        getIdentityProviderRepository: jestApi.fn()
    },
    redis: {
        userCacheInstance: {
            getUserExistenceRepository: jestApi.fn()
        },
        sessionInstance: {
            getUserLockRepository: jestApi.fn()
        }
    }
}));

jestApi.mock('#src/lib/index.js', () => ({
    createCoalescingKey: jestApi.fn(
        ({ db, repository, method }) => (args) => `${db}:${repository}:${method}:${JSON.stringify(args)}`
    )
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
    existingUser = null,
    lookupError = null,
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
        findUserWithIdentityProvider: lookupError
            ? jestApi.fn().mockRejectedValue(lookupError)
            : jestApi.fn().mockResolvedValue(existingUser),
        createButIgnoreIfExists: jestApi.fn().mockResolvedValue(undefined),
        findByEmail: jestApi.fn().mockResolvedValue(dbUser)
    };
    const identityProviderRepository = {
        create: identityCreateError
            ? jestApi.fn().mockRejectedValue(identityCreateError)
            : jestApi.fn().mockResolvedValue({})
    };

    const verify = createGoogleOidcAuthenticationCallback({
        userRepository,
        identityProviderRepository,
        mysqlSequelizeClient: { transaction: jestApi.fn().mockResolvedValue(transaction) }
    });
    const logger = { debug: jestApi.fn() };

    const run = () => {
        let resolveResult;
        const result = new Promise((resolve) => {
            resolveResult = resolve;
        });
        const done = jestApi.fn((error, user) => resolveResult({ error, user }));

        verify({ log: logger }, 'issuer', profile, done);
        return { done, result };
    };

    return {
        userRepository,
        identityProviderRepository,
        transaction,
        run
    };
};

describe('Google OIDC authentication callback', () => {
    afterEach(() => {
        jestApi.clearAllMocks();
    });

    test('reuses an existing identity and caches the authenticated user', async () => {
        const existingUser = {
            id: 'linked-user-id',
            email: 'urva@example.com',
            firstName: 'Urva',
            lastName: 'Patel'
        };
        const { userRepository, transaction, run } = setup({ existingUser });
        const { done, result } = run();

        const { error, user } = await result;

        expect(error).toBeNull();
        expect(user).toEqual(existingUser);
        expect(userRepository.findUserWithIdentityProvider).toHaveBeenCalledWith(
            'google',
            'google-id'
        );
        expect(transaction.commit).not.toHaveBeenCalled();
        expect(done).toHaveBeenCalledWith(null, existingUser);
    });

    test('creates a user and identity, commits, caches the user, and completes Passport', async () => {
        const {
            userRepository,
            identityProviderRepository,
            transaction,
            run
        } = setup();
        const { done, result } = run();

        const { error, user } = await result;

        expect(error).toBeNull();
        expect(user).toEqual(expect.objectContaining({
            id: 'persisted-user-id',
            email: 'urva@example.com'
        }));
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
        expect(done).toHaveBeenCalledWith(null, expect.objectContaining({
            id: 'persisted-user-id'
        }));
    });

    test('rolls back and reuses the user when the identity insert is a concurrent duplicate', async () => {
        const duplicateError = new Error('Duplicate identity');
        duplicateError.name = 'SequelizeUniqueConstraintError';
        const {
            identityProviderRepository,
            transaction,
            run
        } = setup({ identityCreateError: duplicateError });
        const { done, result } = run();

        const { error, user } = await result;

        expect(error).toBeNull();
        expect(user.id).toBe('persisted-user-id');
        expect(identityProviderRepository.create).toHaveBeenCalled();
        expect(transaction.rollback).toHaveBeenCalledTimes(1);
        expect(transaction.commit).not.toHaveBeenCalled();
        expect(done).toHaveBeenCalledWith(null, expect.objectContaining({
            id: 'persisted-user-id'
        }));
    });

    test('rolls back and passes an error when the user cannot be found after insert', async () => {
        const { transaction, run } = setup({ dbUser: null });
        const { done, result } = run();

        const { error, user } = await result;

        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe(
            '[Google OIDC] Failed to find user after creation in userRepository.'
        );
        expect(user).toBeUndefined();
        expect(transaction.rollback).toHaveBeenCalledTimes(1);
        expect(transaction.commit).not.toHaveBeenCalled();
        expect(done).toHaveBeenCalledWith(error);
    });

    test('rolls back and passes unexpected identity creation errors', async () => {
        const identityError = new Error('Identity insert failed');
        const { transaction, run } = setup({ identityCreateError: identityError });
        const { done, result } = run();

        const { error } = await result;

        expect(error).toBe(identityError);
        expect(transaction.rollback).toHaveBeenCalledTimes(1);
        expect(transaction.commit).not.toHaveBeenCalled();
        expect(done).toHaveBeenCalledWith(identityError);
    });

    test('passes an unexpected identity lookup error to Passport', async () => {
        const lookupError = new Error('Identity lookup failed');
        const { done, result } = setup({ lookupError }).run();

        const { error, user } = await result;

        expect(error).toBe(lookupError);
        expect(user).toBeUndefined();
        expect(done).toHaveBeenCalledWith(lookupError);
    });
});
