const { describe, test, jest: jestApi, expect } = require('@jest/globals');
const createProfileService = require('../../../src/services/mainApp/profile/profile.service');
const { AuthenticationError, NotFoundError } = require('../../../src/errors');

const logger = { debug: jestApi.fn() };
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
    ...overrides
});

describe('profile service', () => {
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
});
