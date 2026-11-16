const { afterEach, describe, test, jest: jestApi, expect } = require('@jest/globals');
const createProfileServiceWithDependencies = require('../../../src/services/mainApp/profile/profile.service');
const { AuthenticationError, ConflictError, NotFoundError } = require('../../../src/errors');

const logger = { debug: jestApi.fn(), error: jestApi.fn(), fatal: jestApi.fn() };
const requester = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    email: 'ada@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    phone: '+123456789',
    dateOfBirth: '1815-12-10',
    gender: null,
    profilePhoto: null,
    profileCompleted: true,
    passwordHash: 'secret'
};
const createRepository = (overrides = {}) => ({
    findById: jestApi.fn(),
    updateById: jestApi.fn().mockResolvedValue([1]),
    deleteById: jestApi.fn().mockResolvedValue(1),
    ...overrides
});
const createCache = (overrides = {}) => ({
    getById: jestApi.fn().mockResolvedValue(null),
    setById: jestApi.fn().mockResolvedValue(undefined),
    invalidateById: jestApi.fn().mockResolvedValue(undefined),
    ...overrides
});
const createLock = (overrides = {}) => ({
    acquire: jestApi.fn().mockResolvedValue('OK'),
    release: jestApi.fn().mockResolvedValue(1),
    isLocked: jestApi.fn().mockResolvedValue(false),
    ...overrides
});
const createProfileService = (dependencies = {}) => createProfileServiceWithDependencies({
    userCacheRepository: createCache(),
    userLockRepository: createLock(),
    ...dependencies
});

describe('profile service', () => {
    afterEach(() => jestApi.useRealTimers());

    test('rejects an invalid repository', () => {
        expect(() => createProfileService({ userRepository: {} })).toThrow(TypeError);
    });

    test('getMyProfile returns only profile fields', async () => {
        const repository = createRepository({
            findById: jestApi.fn().mockResolvedValue(requester)
        });
        const service = createProfileService({ userRepository: repository });
        const profile = await service.getMyProfile({ id: requester.id }, logger);

        expect(repository.findById).toHaveBeenCalledWith(requester.id);
        expect(profile).toMatchObject({ id: requester.id, email: 'ada@example.com', phone: '+123456789' });
        expect(profile).not.toHaveProperty('passwordHash');
    });

    test('coalesces overlapping reads for the authenticated profile', async () => {
        let resolveRead;
        const repository = createRepository({
            findById: jestApi.fn(() => new Promise((resolve) => {
                resolveRead = resolve;
            }))
        });
        const service = createProfileService({ userRepository: repository });

        const firstRead = service.getMyProfile({ id: requester.id }, logger);
        const secondRead = service.getMyProfile({ id: requester.id }, logger);

        await Promise.resolve();
        expect(repository.findById).toHaveBeenCalledTimes(1);
        resolveRead(requester);

        await expect(Promise.all([firstRead, secondRead])).resolves.toEqual([
            expect.objectContaining({ email: requester.email }),
            expect.objectContaining({ email: requester.email })
        ]);
    });

    test('getMyProfile rejects a missing user', async () => {
        const repository = createRepository({ findById: jestApi.fn().mockResolvedValue(null) });
        const service = createProfileService({ userRepository: repository });
        await expect(service.getMyProfile({ id: requester.id }, logger)).rejects.toBeInstanceOf(NotFoundError);
    });

    test('getMyProfile requires a user', async () => {
        const service = createProfileService({ userRepository: createRepository() });
        await expect(service.getMyProfile(undefined, logger)).rejects.toBeInstanceOf(AuthenticationError);
    });

    test('updateMyProfile persists changes and returns the refreshed profile', async () => {
        const repository = createRepository({
            findById: jestApi.fn().mockResolvedValue({ ...requester, firstName: 'Augusta' })
        });
        const service = createProfileService({ userRepository: repository });

        const profile = await service.updateMyProfile(requester, { firstName: 'Augusta' }, logger);

        expect(repository.updateById).toHaveBeenCalledWith(requester.id, { firstName: 'Augusta' });
        expect(profile.firstName).toBe('Augusta');
    });

    test('updateMyProfile throws when the user vanished', async () => {
        const repository = createRepository({ findById: jestApi.fn().mockResolvedValue(null) });
        const service = createProfileService({ userRepository: repository });

        await expect(service.updateMyProfile(requester, { firstName: 'X1' }, logger))
            .rejects.toBeInstanceOf(NotFoundError);
    });

    test('getProfileById looks up and returns the full profile for the requester', async () => {
        const repository = createRepository({
            findById: jestApi.fn().mockResolvedValue(requester)
        });
        const service = createProfileService({ userRepository: repository });

        const profile = await service.getProfileById({ id: requester.id.toUpperCase() }, requester.id, logger);

        expect(profile.email).toBe('ada@example.com');
        expect(profile.phone).toBe(requester.phone);
        expect(repository.findById).toHaveBeenCalledWith(requester.id);
    });

    test('coalesces overlapping reads for the same requester and profile', async () => {
        let resolveRead;
        const repository = createRepository({
            findById: jestApi.fn(() => new Promise((resolve) => {
                resolveRead = resolve;
            }))
        });
        const service = createProfileService({ userRepository: repository });

        const firstRead = service.getProfileById(requester, requester.id, logger);
        const secondRead = service.getProfileById(requester, requester.id, logger);

        await Promise.resolve();
        expect(repository.findById).toHaveBeenCalledTimes(1);
        resolveRead(requester);

        await expect(Promise.all([firstRead, secondRead])).resolves.toEqual([
            expect.objectContaining({ email: requester.email }),
            expect.objectContaining({ email: requester.email })
        ]);
    });

    test('coalesces reads across requesters while preserving different profile visibility', async () => {
        const otherRequester = {
            id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
        };
        const repository = createRepository({
            findById: jestApi.fn().mockResolvedValue(requester)
        });
        const service = createProfileService({ userRepository: repository });

        const [ownProfile, publicProfile] = await Promise.all([
            service.getProfileById({ id: requester.id }, requester.id, logger),
            service.getProfileById(otherRequester, requester.id, logger)
        ]);

        expect(repository.findById).toHaveBeenCalledTimes(1);
        expect(ownProfile.email).toBe(requester.email);
        expect(publicProfile).not.toHaveProperty('email');
        expect(publicProfile).toEqual({
            id: requester.id,
            firstName: requester.firstName,
            lastName: requester.lastName,
            profilePhoto: requester.profilePhoto
        });
    });

    test('getProfileById returns 404 if the requester profile no longer exists', async () => {
        const repository = createRepository({ findById: jestApi.fn().mockResolvedValue(null) });
        const service = createProfileService({ userRepository: repository });

        await expect(service.getProfileById({ id: requester.id }, requester.id, logger))
            .rejects.toBeInstanceOf(NotFoundError);
    });
    test('getProfileById returns only public fields for another user', async () => {
        const repository = createRepository({
            findById: jestApi.fn().mockResolvedValue({ ...requester, id: 'other' })
        });
        const service = createProfileService({ userRepository: repository });

        const profile = await service.getProfileById(requester, 'other', logger);

        expect(profile).toEqual({ id: 'other', firstName: 'Ada', lastName: 'Lovelace', profilePhoto: null });
    });

    test('getProfileById throws NotFoundError for unknown users', async () => {
        const repository = createRepository({ findById: jestApi.fn().mockResolvedValue(null) });
        const service = createProfileService({ userRepository: repository });

        await expect(service.getProfileById(requester, 'missing', logger))
            .rejects.toBeInstanceOf(NotFoundError);
    });

    test('returns a cached profile without querying the database', async () => {
        const cache = createCache({ getById: jestApi.fn().mockResolvedValue(requester) });
        const repository = createRepository();
        const service = createProfileService({ userRepository: repository, userCacheRepository: cache });

        await expect(service.getMyProfile(requester, logger))
            .resolves.toMatchObject({ id: requester.id, email: requester.email });
        expect(cache.getById).toHaveBeenCalledWith(requester.id);
        expect(repository.findById).not.toHaveBeenCalled();
    });

    test('falls back to the database on cache failure and caches an unlocked result', async () => {
        const error = new Error('cache unavailable');
        const cache = createCache({ getById: jestApi.fn().mockRejectedValue(error) });
        const lock = createLock();
        const repository = createRepository({ findById: jestApi.fn().mockResolvedValue(requester) });
        const service = createProfileService({
            userRepository: repository, userCacheRepository: cache, userLockRepository: lock
        });

        await expect(service.getMyProfile(requester, logger)).resolves.toMatchObject({ id: requester.id });
        expect(logger.error).toHaveBeenCalledWith({ profileId: requester.id, error }, expect.any(String));
        expect(lock.isLocked).toHaveBeenCalledWith(requester.id);
        expect(cache.setById).toHaveBeenCalledWith(requester.id, requester);
    });

    test.each([
        ['locked', () => Promise.resolve(true)],
        ['lock check fails', () => Promise.reject(new Error('lock unavailable'))]
    ])('does not cache a database result when %s', async (_label, checkLock) => {
        const cache = createCache();
        const lock = createLock({ isLocked: jestApi.fn(checkLock) });
        const service = createProfileService({
            userRepository: createRepository({ findById: jestApi.fn().mockResolvedValue(requester) }),
            userCacheRepository: cache,
            userLockRepository: lock
        });

        await expect(service.getMyProfile(requester, logger)).resolves.toMatchObject({ id: requester.id });
        expect(cache.setById).not.toHaveBeenCalled();
    });

    test('continues returning a database profile if caching it fails', async () => {
        const error = new Error('cache write failed');
        const cache = createCache({ setById: jestApi.fn().mockRejectedValue(error) });
        const service = createProfileService({
            userRepository: createRepository({ findById: jestApi.fn().mockResolvedValue(requester) }),
            userCacheRepository: cache
        });

        await expect(service.getMyProfile(requester, logger)).resolves.toMatchObject({ id: requester.id });
        expect(logger.error).toHaveBeenCalledWith({ profileId: requester.id, error }, expect.any(String));
    });

    test('updates under a lock, invalidating the cache before writing and releasing with the same token', async () => {
        const repository = createRepository({ findById: jestApi.fn().mockResolvedValue(requester) });
        const cache = createCache();
        const lock = createLock();
        const service = createProfileService({
            userRepository: repository, userCacheRepository: cache, userLockRepository: lock
        });

        await service.updateMyProfile(requester, { firstName: 'Ada' }, logger);

        const token = lock.acquire.mock.calls[0][1];
        expect(lock.acquire).toHaveBeenCalledWith(requester.id, expect.any(String));
        expect(cache.invalidateById).toHaveBeenCalledWith(requester.id);
        expect(cache.invalidateById.mock.invocationCallOrder[0]).toBeLessThan(repository.updateById.mock.invocationCallOrder[0]);
        expect(lock.release).toHaveBeenCalledWith(requester.id, token);
    });

    test.each(['updateMyProfile', 'deleteMyProfile'])('%s rejects a competing lock', async (method) => {
        const repository = createRepository();
        const lock = createLock({ acquire: jestApi.fn().mockResolvedValue(null) });
        const service = createProfileService({ userRepository: repository, userLockRepository: lock });

        const result = method === 'updateMyProfile'
            ? service.updateMyProfile(requester, {}, logger)
            : service.deleteMyProfile(requester, logger);
        await expect(result).rejects.toBeInstanceOf(ConflictError);
        expect(repository.updateById).not.toHaveBeenCalled();
        expect(repository.deleteById).not.toHaveBeenCalled();
    });

    test('releases the update lock when the database write fails', async () => {
        const error = new Error('database unavailable');
        const repository = createRepository({ updateById: jestApi.fn().mockRejectedValue(error) });
        const lock = createLock();
        const service = createProfileService({ userRepository: repository, userLockRepository: lock });

        await expect(service.updateMyProfile(requester, {}, logger)).rejects.toBe(error);
        expect(lock.release).toHaveBeenCalledWith(requester.id, lock.acquire.mock.calls[0][1]);
    });

    test('retries a failed lock release after updating', async () => {
        jestApi.useFakeTimers();
        const repository = createRepository({ findById: jestApi.fn().mockResolvedValue(requester) });
        const lock = createLock({
            release: jestApi.fn().mockRejectedValueOnce(new Error('redis unavailable')).mockResolvedValue(1)
        });
        const service = createProfileService({ userRepository: repository, userLockRepository: lock });
        const result = service.updateMyProfile(requester, {}, logger);

        await jestApi.runAllTimersAsync();
        await expect(result).resolves.toMatchObject({ id: requester.id });
        expect(lock.release).toHaveBeenCalledTimes(2);
        expect(lock.release).toHaveBeenNthCalledWith(2, requester.id, lock.acquire.mock.calls[0][1]);
    });

    test('deletes under a lock and invalidates the cache before and after the database write', async () => {
        const repository = createRepository();
        const cache = createCache();
        const lock = createLock();
        const service = createProfileService({
            userRepository: repository, userCacheRepository: cache, userLockRepository: lock
        });

        await service.deleteMyProfile(requester, logger);

        expect(repository.deleteById).toHaveBeenCalledWith(requester.id);
        expect(cache.invalidateById).toHaveBeenNthCalledWith(1, requester.id);
        expect(cache.invalidateById).toHaveBeenNthCalledWith(2, requester.id);
        expect(cache.invalidateById.mock.invocationCallOrder[0]).toBeLessThan(repository.deleteById.mock.invocationCallOrder[0]);
        expect(repository.deleteById.mock.invocationCallOrder[0]).toBeLessThan(cache.invalidateById.mock.invocationCallOrder[1]);
        expect(lock.release).toHaveBeenCalledWith(requester.id, lock.acquire.mock.calls[0][1]);
    });

    test('logs a failed post-delete invalidation and still releases the lock', async () => {
        const error = new Error('cache unavailable');
        const cache = createCache({
            invalidateById: jestApi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(error)
        });
        const lock = createLock();
        const service = createProfileService({
            userRepository: createRepository(), userCacheRepository: cache, userLockRepository: lock
        });

        await expect(service.deleteMyProfile(requester, logger)).resolves.toEqual({ success: true });
        expect(logger.error).toHaveBeenCalledWith({ userId: requester.id, error }, expect.any(String));
        expect(lock.release).toHaveBeenCalledWith(requester.id, lock.acquire.mock.calls[0][1]);
    });

    test('releases the delete lock when the database write fails', async () => {
        const error = new Error('database unavailable');
        const repository = createRepository({ deleteById: jestApi.fn().mockRejectedValue(error) });
        const cache = createCache();
        const lock = createLock();
        const service = createProfileService({
            userRepository: repository, userCacheRepository: cache, userLockRepository: lock
        });

        await expect(service.deleteMyProfile(requester, logger)).rejects.toBe(error);
        expect(cache.invalidateById).toHaveBeenCalledTimes(1);
        expect(lock.release).toHaveBeenCalledWith(requester.id, lock.acquire.mock.calls[0][1]);
    });

    test('delete requires an authenticated user', async () => {
        const service = createProfileService({ userRepository: createRepository() });
        await expect(service.deleteMyProfile(undefined, logger)).rejects.toBeInstanceOf(AuthenticationError);
    });
});
