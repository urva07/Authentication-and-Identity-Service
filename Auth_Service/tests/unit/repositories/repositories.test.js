const { describe, jest: jestApi, test, expect } = require('@jest/globals');
const {
    userRepository,
    userPasswordRepository,
    identityProviderRepository
} = require('../../../src/repositories/mysql');

describe('authentication repositories', () => {
    const userId = '3f0c1d52-8a7e-4b1c-9d34-5e6f7a8b9c0d';
    const createModel = () => ({
        create: jestApi.fn(),
        findOrCreate: jestApi.fn(),
        findByPk: jestApi.fn(),
        findOne: jestApi.fn(),
        findAll: jestApi.fn(),
        update: jestApi.fn(),
        destroy: jestApi.fn()
    });
    const createQueryLogger = () => () => {};
    const queryOptions = { benchmark: true, logging: expect.any(Function) };

    test('routes user operations to users by primary key', async () => {
        const User = createModel();
        const user = userRepository({ User, createQueryLogger });
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
        expect(User.create).toHaveBeenCalledWith(attributes, queryOptions);
        expect(User.findByPk).toHaveBeenCalledWith(userId, queryOptions);
        expect(User.update).toHaveBeenCalledWith(attributes, {
            where: { id: userId }, ...queryOptions
        });
        expect(User.destroy).toHaveBeenCalledWith({ where: { id: userId }, ...queryOptions });
    });

    test('looks up users by email', async () => {
        const User = createModel();
        const user = userRepository({ User, createQueryLogger });
        User.findOne.mockResolvedValue({ id: userId });

        await expect(user.findByEmail('ada@example.com')).resolves.toEqual({
            id: userId
        });
        expect(User.findOne).toHaveBeenNthCalledWith(1, {
            where: { email: 'ada@example.com' }, ...queryOptions
        });
    });

    test('creates-but-ignores and find-or-creates users', async () => {
        const User = createModel();
        const user = userRepository({ User, createQueryLogger });
        const attributes = {
            id: userId,
            email: 'ada@example.com',
            firstName: 'Ada',
            lastName: 'Lovelace'
        };
        User.create.mockResolvedValue(attributes);
        User.findOrCreate.mockResolvedValue([attributes, true]);

        await expect(
            user.createButIgnoreIfExists(attributes, { transaction: 't' })
        ).resolves.toEqual(attributes);
        expect(User.create).toHaveBeenCalledWith(attributes, {
            ignoreDuplicates: true,
            transaction: 't',
            ...queryOptions
        });

        await expect(
            user.findByEmailOrCreate(
                'ada@example.com',
                attributes,
                { transaction: 't' }
            )
        ).resolves.toEqual([attributes, true]);
        expect(User.findOrCreate).toHaveBeenCalledWith({
            benchmark: true,
            logging: expect.any(Function),
            where: { email: 'ada@example.com' },
            defaults: attributes,
            transaction: 't'
        });
    });

    test('finds a user joined to a provider identity', async () => {
        const User = createModel();
        const IdentityProvider = createModel();
        const user = userRepository({
            User,
            IdentityProvider,
            createQueryLogger
        });
        const foundUser = {
            id: userId,
            email: 'ada@example.com',
            firstName: 'Ada',
            lastName: 'Lovelace'
        };
        User.findOne.mockResolvedValue(foundUser);

        await expect(
            user.findUserWithIdentityProvider('google', 'subject-1')
        ).resolves.toEqual(foundUser);
        expect(User.findOne).toHaveBeenCalledWith({
            attributes: ['id', 'email', 'firstName', 'lastName'],
            include: [
                {
                    model: IdentityProvider,
                    as: 'identityProviders',
                    where: {
                        provider: 'google',
                        providerUserId: 'subject-1'
                    },
                    required: true
                }
            ],
            benchmark: true,
            logging: expect.any(Function)
        });
    });

    test('finds users by email including their required password hash', async () => {
        const UserPassword = createModel();
        const User = createModel();
        const user = userRepository({ User, UserPassword, createQueryLogger });
        User.findOne.mockResolvedValue({ id: userId });

        await expect(
            user.findByEmailWithPassword('ada@example.com')
        ).resolves.toEqual({ id: userId });
        expect(User.findOne).toHaveBeenCalledWith({
            where: { email: 'ada@example.com' }, ...queryOptions,
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
        const userPassword = userPasswordRepository({ UserPassword, createQueryLogger });
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
            where: { userId }, ...queryOptions
        });
    });

    test('looks up and lists identities with their provider keys', async () => {
        const IdentityProvider = createModel();
        const identityProvider = identityProviderRepository({ IdentityProvider, createQueryLogger });
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
            where: { provider: 'google', providerUserId: 'subject-1' }, ...queryOptions
        });
    });
});
