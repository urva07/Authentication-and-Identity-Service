const { describe, jest: jestApi, test, expect } = require('@jest/globals');
const {
    userRepository,
    userPasswordRepository,
    identityProviderRepository
} = require('../../../src/repositories');

describe('authentication repositories', () => {
    const userId = '3f0c1d52-8a7e-4b1c-9d34-5e6f7a8b9c0d';
    const createModel = () => ({
        create: jestApi.fn(),
        findByPk: jestApi.fn(),
        findOne: jestApi.fn(),
        findAll: jestApi.fn(),
        update: jestApi.fn(),
        destroy: jestApi.fn()
    });

    test('routes user operations to users by primary key', async () => {
        const User = createModel();
        const user = userRepository(User);
        const attributes = { firstName: 'Ada' };
        User.create.mockResolvedValue({ id: userId, ...attributes });
        User.findByPk.mockResolvedValue({ id: userId });
        User.update.mockResolvedValue([1]);
        User.destroy.mockResolvedValue(1);

        await expect(user.create(attributes)).resolves.toEqual({
            id: userId,
            ...attributes
        });
        await expect(user.findById(userId)).resolves.toEqual({ id: userId });
        await expect(user.updateById(userId, attributes)).resolves.toEqual([1]);
        await expect(user.deleteById(userId)).resolves.toBe(1);
        expect(User.create).toHaveBeenCalledWith(attributes, {});
        expect(User.findByPk).toHaveBeenCalledWith(userId, {});
        expect(User.update).toHaveBeenCalledWith(attributes, {
            where: { id: userId }
        });
        expect(User.destroy).toHaveBeenCalledWith({ where: { id: userId } });
    });

    test('looks up users by email and phone login identifiers', async () => {
        const User = createModel();
        const user = userRepository(User);
        User.findOne.mockResolvedValue({ id: userId });

        await expect(user.findByEmail('ada@example.com')).resolves.toEqual({
            id: userId
        });
        await expect(user.findByPhone('+12025550123')).resolves.toEqual({
            id: userId
        });
        expect(User.findOne).toHaveBeenNthCalledWith(1, {
            where: { email: 'ada@example.com' }
        });
        expect(User.findOne).toHaveBeenNthCalledWith(2, {
            where: { phone: '+12025550123' }
        });
    });

    test('finds users by email including their required password hash', async () => {
        const UserPassword = createModel();
        const User = createModel();
        const user = userRepository(User, UserPassword);
        User.findOne.mockResolvedValue({ id: userId });

        await expect(
            user.findByEmailWithPassword('ada@example.com')
        ).resolves.toEqual({ id: userId });
        expect(User.findOne).toHaveBeenCalledWith({
            where: { email: 'ada@example.com' },
            include: [
                {
                    model: UserPassword,
                    as: 'password',
                    required: true,
                    attributes: ['passwordHash']
                }
            ]
        });

        await user.findByEmailWithPassword('ada@example.com', {
            transaction: 't'
        });
        expect(User.findOne).toHaveBeenLastCalledWith(
            expect.objectContaining({ transaction: 't' })
        );
    });

    test('finds password credentials by user and updates or deletes them', async () => {
        const UserPassword = createModel();
        const userPassword = userPasswordRepository(UserPassword);
        UserPassword.findOne.mockResolvedValue({ userId });
        UserPassword.update.mockResolvedValue([1]);
        UserPassword.destroy.mockResolvedValue(1);

        await expect(userPassword.findByUserId(userId)).resolves.toEqual({
            userId
        });
        await expect(
            userPassword.updateByUserId(userId, { passwordHash: 'hash' })
        ).resolves.toEqual([1]);
        await expect(userPassword.deleteByUserId(userId)).resolves.toBe(1);
        expect(UserPassword.findOne).toHaveBeenCalledWith({
            where: { userId }
        });
    });

    test('looks up and lists identities with their provider keys', async () => {
        const IdentityProvider = createModel();
        const identityProvider = identityProviderRepository(IdentityProvider);
        IdentityProvider.findOne.mockResolvedValue({ userId });
        IdentityProvider.findAll.mockResolvedValue([{ userId }]);
        IdentityProvider.destroy.mockResolvedValue(1);

        await expect(
            identityProvider.findByProviderIdentity('google', 'subject-1')
        ).resolves.toEqual({ userId });
        await expect(identityProvider.findAllByUserId(userId)).resolves.toEqual([
            { userId }
        ]);
        await expect(
            identityProvider.deleteByProviderIdentity('google', 'subject-1')
        ).resolves.toBe(1);
        expect(IdentityProvider.findOne).toHaveBeenCalledWith({
            where: { provider: 'google', providerUserId: 'subject-1' }
        });
    });
});
