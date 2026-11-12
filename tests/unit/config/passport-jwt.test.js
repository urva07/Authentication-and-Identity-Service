const {
    afterEach,
    describe,
    expect,
    jest: jestApi,
    test
} = require('@jest/globals');

const mockGetUserRepository = jestApi.fn();

jestApi.mock('#src/repositories/index.js', () => ({
    mysql: {
        getUserRepository: () => mockGetUserRepository()
    }
}));

const { jwtStrategy } = require('../../../src/config/passport/jwt');
const createProfileService = require('../../../src/services/mainApp/profile/profile.service');

describe('JWT user lookup', () => {
    afterEach(() => {
        jestApi.clearAllMocks();
    });

    test('coalesces overlapping lookups for the same user', async () => {
        let resolveLookup;
        const user = { id: 'user-id' };
        const repository = {
            findById: jestApi.fn(() => new Promise((resolve) => {
                resolveLookup = resolve;
            }))
        };
        mockGetUserRepository.mockReturnValue(repository);

        const strategy = jwtStrategy('test-secret', 'header');
        const verify = (payload) => new Promise((resolve, reject) => {
            strategy._verify(payload, (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(result);
            });
        });

        const firstLookup = verify({ sub: 'user-id' });
        const secondLookup = verify({ sub: 'user-id' });

        expect(repository.findById).toHaveBeenCalledTimes(1);
        resolveLookup(user);
        await expect(Promise.all([firstLookup, secondLookup])).resolves.toEqual([
            user,
            user
        ]);
    });

    test('shares an in-flight lookup with the profile service for the same user', async () => {
        let resolveLookup;
        const user = {
            id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            email: 'ada@example.com',
            firstName: 'Ada',
            lastName: 'Lovelace',
            profilePhoto: null
        };
        const repository = {
            findById: jestApi.fn(() => new Promise((resolve) => {
                resolveLookup = resolve;
            }))
        };
        mockGetUserRepository.mockReturnValue(repository);

        const strategy = jwtStrategy('test-secret', 'header');
        const jwtLookup = new Promise((resolve, reject) => {
            strategy._verify({ sub: user.id.toUpperCase() }, (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(result);
            });
        });
        const profileService = createProfileService();
        const profileLookup = profileService.getProfileById(
            { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
            user.id,
            { debug: jestApi.fn() }
        );

        expect(repository.findById).toHaveBeenCalledTimes(1);
        resolveLookup(user);

        const [authenticatedUser, profile] = await Promise.all([
            jwtLookup,
            profileLookup
        ]);
        expect(authenticatedUser).toBe(user);
        expect(profile).toEqual({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePhoto: user.profilePhoto
        });
    });

    test('rejects authentication when the user does not exist', async () => {
        mockGetUserRepository.mockReturnValue({
            findById: jestApi.fn().mockResolvedValue(null)
        });
        const strategy = jwtStrategy('test-secret', 'header');

        await expect(new Promise((resolve, reject) => {
            strategy._verify({ sub: 'missing-user' }, (error, user) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(user);
            });
        })).rejects.toMatchObject({ name: 'AuthenticationError' });
    });
});
