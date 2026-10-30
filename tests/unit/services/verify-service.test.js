const { AuthenticationError } = require('../../../src/errors');
const createVerifyService = require('../../../src/services/verify.service');

describe('verify service', () => {
    const userId = '3f0c1d52-8a7e-4b1c-9d34-5e6f7a8b9c0d';
    test('loads and returns only public user fields', async () => {
        const userRepository = {
            findById: jest.fn().mockResolvedValue({
                id: userId,
                email: 'ada@example.com',
                phone: null,
                firstName: 'Ada',
                lastName: 'Lovelace',
                profilePhoto: null,
                profileCompleted: true,
                passwordHash: 'must not be returned'
            })
        };
        const verifyService = createVerifyService({ userRepository });

        await expect(verifyService.verifyUser(userId)).resolves.toEqual({
            id: userId,
            email: 'ada@example.com',
            phone: null,
            firstName: 'Ada',
            lastName: 'Lovelace',
            profilePhoto: null,
            profileCompleted: true
        });
        expect(userRepository.findById).toHaveBeenCalledWith(userId);
    });

    test('rejects users that no longer exist', async () => {
        const userRepository = {
            findById: jest.fn().mockResolvedValue(null)
        };
        const verifyService = createVerifyService({ userRepository });

        await expect(verifyService.verifyUser(userId)).rejects.toBeInstanceOf(
            AuthenticationError
        );
    });

    test('resolves the configured repository when no test dependency is injected', async () => {
        const User = {
            findByPk: jest.fn().mockResolvedValue({
                id: userId,
                email: 'ada@example.com'
            })
        };
        const UserPassword = {};
        const IdentityProvider = {};
        require('../../../src/repositories').configureRepositories({
            User,
            UserPassword,
            IdentityProvider
        });
        const verifyService = createVerifyService();

        await expect(verifyService.verifyUser(userId)).resolves.toMatchObject({
            id: userId,
            email: 'ada@example.com'
        });
        expect(User.findByPk).toHaveBeenCalledWith(userId, {});
    });
});
