const { DataTypes, Sequelize } = require('sequelize');
const initializeModels = require('../../../src/models');

describe('MySQL user models', () => {
    let sequelize;

    beforeEach(() => {
        sequelize = new Sequelize('test', 'test', 'test', {
            dialect: 'mysql',
            logging: false
        });
    });

    afterEach(async () => {
        await sequelize.close();
    });

    test('defines account, password, and identity provider models', () => {
        const models = initializeModels(sequelize);

        expect(Object.keys(models)).toEqual([
            'User',
            'UserPassword',
            'IdentityProvider'
        ]);
        expect(models.User.tableName).toBe('users');
        expect(models.UserPassword.tableName).toBe('user_passwords');
        expect(models.IdentityProvider.tableName).toBe('user_idps');
        expect(models.User.rawAttributes.id.type.toString()).toBe(
            DataTypes.BIGINT.UNSIGNED.toString()
        );
        expect(models.User.rawAttributes.email.unique).toBe(true);
        expect(models.User.rawAttributes.phone.unique).toBe(true);
        expect(models.User.rawAttributes.id.autoIncrement).toBe(true);
        expect(models.User.rawAttributes.profileCompleted.defaultValue).toBe(
            false
        );
        expect(models.UserPassword.rawAttributes.passwordHash.allowNull).toBe(
            false
        );
        expect(models.IdentityProvider.options.updatedAt).toBe(false);
    });

    test('sets password and one-to-many identity provider associations', () => {
        const { User, UserPassword, IdentityProvider } =
            initializeModels(sequelize);

        expect(User.associations.passwordCredential.target).toBe(UserPassword);
        expect(User.associations.identityProviders.target).toBe(
            IdentityProvider
        );
        expect(IdentityProvider.associations.user.target).toBe(User);
        expect(IdentityProvider.options.indexes).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    unique: true,
                    fields: ['provider', 'provider_user_id']
                })
            ])
        );
    });
});
