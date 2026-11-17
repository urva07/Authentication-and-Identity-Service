const { describe, beforeEach, afterEach, test, expect } = require('@jest/globals');
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
            'IdentityProvider',
            'ActiveToken'
        ]);
        expect(models.User.tableName).toBe('users');
        expect(models.UserPassword.tableName).toBe('user_passwords');
        expect(models.IdentityProvider.tableName).toBe('user_idps');
        expect(models.User.rawAttributes.id.type).toBeInstanceOf(DataTypes.UUID);
        expect(models.User.rawAttributes.email.unique).toBe(true);
        expect(models.User.rawAttributes.phone.unique).toBe(true);
        expect(models.User.rawAttributes.id.autoIncrement).toBeFalsy();
        expect(models.User.rawAttributes.id.defaultValue).toBeInstanceOf(
            DataTypes.UUIDV4
        );
        expect(models.UserPassword.rawAttributes.userId.type).toBeInstanceOf(
            DataTypes.UUID
        );
        expect(models.IdentityProvider.rawAttributes.userId.type).toBeInstanceOf(
            DataTypes.UUID
        );
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

        expect(User.associations.password.target).toBe(UserPassword);
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
