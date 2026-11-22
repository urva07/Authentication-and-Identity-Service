const {
    afterEach,
    describe,
    expect,
    jest: jestApi,
    test
} = require('@jest/globals');

const mockGenerateUUID = jestApi.fn(() => 'cache-token');
const mockRetry = jestApi.fn();
mockRetry.mockImplementation(async (operation) => operation());

jestApi.mock('../../../src/utils/userIdGenerator.js', () => ({
    generateUUID: (...args) => mockGenerateUUID(...args)
}));

jestApi.mock('../../../src/lib/retryWithExponentialBackoff.js', () => (
    (...args) => mockRetry(...args)
));

const cacheAuthenticatedUser = require('../../../src/lib/cacheAuthenticatedUser');
const lib = require('../../../src/lib');

const createLogger = () => ({
    debug: jestApi.fn(),
    error: jestApi.fn()
});

describe('cacheAuthenticatedUser', () => {
    afterEach(() => {
        jestApi.clearAllMocks();
        mockRetry.mockImplementation(async (operation) => operation());
    });

    test('is exported from the lib index', () => {
        expect(lib.cacheAuthenticatedUser).toBe(cacheAuthenticatedUser);
    });

    test('caches user existence and releases the lock', async () => {
        const logger = createLogger();
        const userExistenceRepository = {
            setById: jestApi.fn().mockResolvedValue(undefined)
        };
        const userLockRepository = {
            acquire: jestApi.fn().mockResolvedValue(true),
            release: jestApi.fn().mockResolvedValue(undefined)
        };

        await cacheAuthenticatedUser(
            { userExistenceRepository, userLockRepository },
            'user-id',
            logger
        );

        expect(mockGenerateUUID).toHaveBeenCalledTimes(1);
        expect(userLockRepository.acquire).toHaveBeenCalledWith(
            'user-id',
            'cache-token'
        );
        expect(userExistenceRepository.setById).toHaveBeenCalledWith('user-id');
        expect(mockRetry).toHaveBeenCalledWith(
            expect.any(Function),
            5
        );
        expect(userLockRepository.release).toHaveBeenCalledWith(
            'user-id',
            'cache-token'
        );
    });

    test('skips cache writes when the user lock is already held', async () => {
        const logger = createLogger();
        const userExistenceRepository = {
            setById: jestApi.fn()
        };
        const userLockRepository = {
            acquire: jestApi.fn().mockResolvedValue(false),
            release: jestApi.fn()
        };

        await cacheAuthenticatedUser(
            { userExistenceRepository, userLockRepository },
            'user-id',
            logger
        );

        expect(userExistenceRepository.setById).not.toHaveBeenCalled();
        expect(mockRetry).not.toHaveBeenCalled();
        expect(userLockRepository.release).not.toHaveBeenCalled();
        expect(logger.debug).toHaveBeenCalledWith(
            { userId: 'user-id' },
            'Skipping user existence cache on authentication as user is locked to cache'
        );
    });

    test('skips cache writes when lock acquisition fails', async () => {
        const logger = createLogger();
        const acquireError = new Error('Redis unavailable');
        const userExistenceRepository = {
            setById: jestApi.fn()
        };
        const userLockRepository = {
            acquire: jestApi.fn().mockRejectedValue(acquireError),
            release: jestApi.fn()
        };

        await cacheAuthenticatedUser(
            { userExistenceRepository, userLockRepository },
            'user-id',
            logger
        );

        expect(userExistenceRepository.setById).not.toHaveBeenCalled();
        expect(mockRetry).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(
            { userId: 'user-id', err: acquireError },
            'Failed to check user lock; skipping cache'
        );
    });

    test('still releases the lock when caching fails', async () => {
        const logger = createLogger();
        const cacheError = new Error('Set failed');
        const userExistenceRepository = {
            setById: jestApi.fn().mockRejectedValue(cacheError)
        };
        const userLockRepository = {
            acquire: jestApi.fn().mockResolvedValue(true),
            release: jestApi.fn().mockResolvedValue(undefined)
        };

        await cacheAuthenticatedUser(
            { userExistenceRepository, userLockRepository },
            'user-id',
            logger
        );

        expect(logger.error).toHaveBeenCalledWith(
            { userId: 'user-id', err: cacheError },
            'Failed to cache user existence on authentication'
        );
        expect(userLockRepository.release).toHaveBeenCalledWith(
            'user-id',
            'cache-token'
        );
    });

    test('logs an error when lock release retries are exhausted', async () => {
        const logger = createLogger();
        const releaseError = new Error('Release failed');
        const userExistenceRepository = {
            setById: jestApi.fn().mockResolvedValue(undefined)
        };
        const userLockRepository = {
            acquire: jestApi.fn().mockResolvedValue(true),
            release: jestApi.fn()
        };
        mockRetry.mockRejectedValue(releaseError);

        await cacheAuthenticatedUser(
            { userExistenceRepository, userLockRepository },
            'user-id',
            logger
        );

        expect(logger.error).toHaveBeenCalledWith(
            { userId: 'user-id', err: releaseError },
            'Failed to release user lock'
        );
    });
});
