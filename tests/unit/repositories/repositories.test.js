const {
    userRepository,
    userPasswordRepository,
    identityProviderRepository
} = require('../../../src/repositories');

describe('authentication repositories', () => {
    const createModel = () => ({
        create: jest.fn(),
        findByPk: jest.fn(),
        findOne: jest.fn(),
        findAll: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn()
    });

    test('routes user operations to users by primary key', async () => {
        const User = createModel();
        const user = userRepository(User);
        const attributes = { firstName: 'Ada' };
        User.create.mockResolvedValue({ id: 1, ...attributes });
        User.findByPk.mockResolvedValue({ id: 1 });
        User.update.mockResolvedValue([1]);
        User.destroy.mockResolvedValue(1);

        await expect(user.create(attributes)).resolves.toEqual({
            id: 1,
            ...attributes
        });
        await expect(user.findById(1)).resolves.toEqual({ id: 1 });
        await expect(user.updateById(1, attributes)).resolves.toEqual([1]);
        await expect(user.deleteById(1)).resolves.toBe(1);
        expect(User.findByPk).toHaveBeenCalledWith(1);
        expect(User.update).toHaveBeenCalledWith(attributes, {
            where: { id: 1 }
        });
        expect(User.destroy).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    test('looks up users by email and phone login identifiers', async () => {
        const User = createModel();
        const user = userRepository(User);
        User.findOne.mockResolvedValue({ id: 1 });

        await expect(user.findByEmail('ada@example.com')).resolves.toEqual({
            id: 1
        });
        await expect(user.findByPhone('+12025550123')).resolves.toEqual({
            id: 1
        });
        expect(User.findOne).toHaveBeenNthCalledWith(1, {
            where: { email: 'ada@example.com' }
        });
        expect(User.findOne).toHaveBeenNthCalledWith(2, {
            where: { phone: '+12025550123' }
        });
    });

    test('finds password credentials by user and updates or deletes them', async () => {
        const UserPassword = createModel();
        const userPassword = userPasswordRepository(UserPassword);
        UserPassword.findOne.mockResolvedValue({ userId: 1 });
        UserPassword.update.mockResolvedValue([1]);
        UserPassword.destroy.mockResolvedValue(1);

        await expect(userPassword.findByUserId(1)).resolves.toEqual({
            userId: 1
        });
        await expect(
            userPassword.updateByUserId(1, { passwordHash: 'hash' })
        ).resolves.toEqual([1]);
        await expect(userPassword.deleteByUserId(1)).resolves.toBe(1);
        expect(UserPassword.findOne).toHaveBeenCalledWith({
            where: { userId: 1 }
        });
    });

    test('looks up and lists identities with their provider keys', async () => {
        const IdentityProvider = createModel();
        const identityProvider = identityProviderRepository(IdentityProvider);
        IdentityProvider.findOne.mockResolvedValue({ userId: 1 });
        IdentityProvider.findAll.mockResolvedValue([{ userId: 1 }]);
        IdentityProvider.destroy.mockResolvedValue(1);

        await expect(
            identityProvider.findByProviderIdentity('google', 'subject-1')
        ).resolves.toEqual({ userId: 1 });
        await expect(identityProvider.findAllByUserId(1)).resolves.toEqual([
            { userId: 1 }
        ]);
        await expect(
            identityProvider.deleteByProviderIdentity('google', 'subject-1')
        ).resolves.toBe(1);
        expect(IdentityProvider.findOne).toHaveBeenCalledWith({
            where: { provider: 'google', providerUserId: 'subject-1' }
        });
    });
});
