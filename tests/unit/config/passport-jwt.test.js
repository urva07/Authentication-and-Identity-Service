const {
    afterEach,
    describe,
    expect,
    jest: jestApi,
    test
} = require('@jest/globals');

const mockGetUserRepository = jestApi.fn();
const mockGetUserExistenceRepository = jestApi.fn();
const mockGetUserLockRepository = jestApi.fn();
const mockCacheAuthenticatedUser = jestApi.fn().mockResolvedValue(undefined);

jestApi.mock('#src/repositories/index.js', () => ({
    mysql: {
        getUserRepository: () => mockGetUserRepository()
    },
    redis: {
        userCacheInstance: {
            getUserExistenceRepository: () => mockGetUserExistenceRepository()
        },
        sessionInstance: {
            getUserLockRepository: () => mockGetUserLockRepository()
        }
    }
}));

jestApi.mock('#src/lib/index.js', () => {
    const actual = jestApi.requireActual('#src/lib/index.js');
    return {
        ...actual,
        cacheAuthenticatedUser: (...args) => mockCacheAuthenticatedUser(...args)
    };
});

const {
    jwtAuthenticationCallback,
    jwtStrategy
} = require('../../../src/config/passport/jwt');

const setup = ({
    cachedUserExist = null,
    dbUser = null,
    cacheError = null,
    dbError = null
} = {}) => {
    const userRepository = {
        findById: dbError
            ? jestApi.fn().mockRejectedValue(dbError)
            : jestApi.fn().mockResolvedValue(dbUser)
    };
    const userExistenceRepository = {
        getById: cacheError
            ? jestApi.fn().mockRejectedValue(cacheError)
            : jestApi.fn().mockResolvedValue(cachedUserExist)
    };
    const userLockRepository = {
        acquire: jestApi.fn(),
        release: jestApi.fn()
    };

    const verify = jwtAuthenticationCallback({
        userRepository,
        userExistenceRepository,
        userLockRepository
    });

    const run = (payload) => new Promise((resolve, reject) => {
        verify(payload, (error, user) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(user);
        });
    });

    return {
        userRepository,
        userExistenceRepository,
        userLockRepository,
        run
    };
};

describe('JWT authentication callback', () => {
    afterEach(() => {
        jestApi.clearAllMocks();
    });

    test('rejects payloads without a subject', async () => {
        const { run, userRepository, userExistenceRepository } = setup();

        await expect(run({})).rejects.toMatchObject({
            name: 'AuthenticationError',
            message: 'No sub received on payload'
        });
        expect(userRepository.findById).not.toHaveBeenCalled();
        expect(userExistenceRepository.getById).not.toHaveBeenCalled();
    });

    test('returns the user id on a cache hit without querying the database', async () => {
        const { run, userRepository, userExistenceRepository } = setup({
            cachedUserExist: { id: 'user-id' }
        });

        await expect(run({ sub: 'user-id' })).resolves.toEqual({ id: 'user-id' });
        expect(userExistenceRepository.getById).toHaveBeenCalledWith('user-id');
        expect(userRepository.findById).not.toHaveBeenCalled();
        expect(mockCacheAuthenticatedUser).not.toHaveBeenCalled();
    });

    test('fetches and caches a user on a cache miss', async () => {
        const dbUser = { id: 'user-id', email: 'ada@example.com' };
        const {
            run,
            userRepository,
            userExistenceRepository,
            userLockRepository
        } = setup({ dbUser });

        await expect(run({ sub: 'user-id' })).resolves.toEqual({ id: 'user-id' });
        expect(userExistenceRepository.getById).toHaveBeenCalledWith('user-id');
        expect(userRepository.findById).toHaveBeenCalledWith('user-id');
        expect(mockCacheAuthenticatedUser).toHaveBeenCalledWith(
            { userExistenceRepository, userLockRepository },
            'user-id',
            expect.anything()
        );
    });

    test('falls back to the database when cache lookup fails', async () => {
        const dbUser = { id: 'user-id' };
        const {
            run,
            userRepository
        } = setup({
            cacheError: new Error('Redis unavailable'),
            dbUser
        });

        await expect(run({ sub: 'user-id' })).resolves.toEqual({ id: 'user-id' });
        expect(userRepository.findById).toHaveBeenCalledWith('user-id');
        expect(mockCacheAuthenticatedUser).toHaveBeenCalledWith(
            expect.objectContaining({
                userExistenceRepository: expect.anything(),
                userLockRepository: expect.anything()
            }),
            'user-id',
            expect.anything()
        );
    });

    test('rejects authentication when neither cache nor database contains the user', async () => {
        const { run, userRepository, userExistenceRepository } = setup();

        await expect(run({ sub: 'missing-user' })).rejects.toMatchObject({
            name: 'AuthenticationError',
            message: 'Invalid token'
        });
        expect(userExistenceRepository.getById).toHaveBeenCalledWith('missing-user');
        expect(userRepository.findById).toHaveBeenCalledWith('missing-user');
    });

    test('passes unexpected database lookup errors to Passport', async () => {
        const dbError = new Error('Database unavailable');
        const { run } = setup({ dbError });

        await expect(run({ sub: 'user-id' })).rejects.toBe(dbError);
    });

    test('coalesces overlapping lookups for the same user id', async () => {
        let resolveLookup;
        const dbUser = { id: 'user-id' };
        const userRepository = {
            findById: jestApi.fn(() => new Promise((resolve) => {
                resolveLookup = resolve;
            }))
        };
        const userExistenceRepository = {
            getById: jestApi.fn().mockResolvedValue(null)
        };
        const userLockRepository = {
            acquire: jestApi.fn(),
            release: jestApi.fn()
        };
        const verify = jwtAuthenticationCallback({
            userRepository,
            userExistenceRepository,
            userLockRepository
        });
        const run = (payload) => new Promise((resolve, reject) => {
            verify(payload, (error, user) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(user);
            });
        });

        const firstLookup = run({ sub: 'user-id' });
        const secondLookup = run({ sub: 'user-id' });

        await Promise.resolve();
        await Promise.resolve();
        expect(userRepository.findById).toHaveBeenCalledTimes(1);
        resolveLookup(dbUser);

        await expect(Promise.all([firstLookup, secondLookup])).resolves.toEqual([
            { id: 'user-id' },
            { id: 'user-id' }
        ]);
    });
});

describe('JWT strategy construction', () => {
    test('rejects unsupported token sources', () => {
        expect(() => jwtStrategy('a'.repeat(32), 'query')).toThrow(
            "from argument must be either 'header' or 'cookie'"
        );
    });

    test('requires a cookie name for cookie authentication', () => {
        expect(() => jwtStrategy('a'.repeat(32), 'cookie')).toThrow(
            'cookieName must be provided when \'from\' is \'cookie\''
        );
    });

    test('requires a token secret', () => {
        expect(() => jwtStrategy(undefined, 'header')).toThrow(
            'tokenSecret must be provided'
        );
    });
});
