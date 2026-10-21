const { AuthenticationError } = require('../../../src/errors');
const createVerifyService = require('../../../src/services/verify.service');

describe('verify service', () => {
    test('loads and returns only public user fields', async () => {
        const userRepository = {
            findById: jest.fn().mockResolvedValue({
                id: 42,
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

        await expect(verifyService.verifyUser('42')).resolves.toEqual({
            id: '42',
            email: 'ada@example.com',
            phone: null,
            firstName: 'Ada',
            lastName: 'Lovelace',
            profilePhoto: null,
            profileCompleted: true
        });
        expect(userRepository.findById).toHaveBeenCalledWith('42');
    });

    test('rejects users that no longer exist', async () => {
        const userRepository = {
            findById: jest.fn().mockResolvedValue(null)
        };
        const verifyService = createVerifyService({ userRepository });

        await expect(verifyService.verifyUser('42')).rejects.toBeInstanceOf(
            AuthenticationError
        );
    });

    test('resolves the configured repository when no test dependency is injected', async () => {
        const User = {
            findByPk: jest.fn().mockResolvedValue({
                id: 42,
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

        await expect(verifyService.verifyUser('42')).resolves.toMatchObject({
            id: '42',
            email: 'ada@example.com'
        });
        expect(User.findByPk).toHaveBeenCalledWith('42');
    });
});
