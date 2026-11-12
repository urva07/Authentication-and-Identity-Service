const { describe, test, jest: jestApi, expect } = require('@jest/globals');
const { Sequelize, DataTypes, Transaction } = require('sequelize');
const createUserRepository = require('../../../src/repositories/mysql/user.repository');
const createUserPasswordRepository = require('../../../src/repositories/mysql/userPassword.repository');

describe('password reset repository transaction options', () => {
    test('forwards the row lock and transaction to Sequelize', async () => {
        const User = { findByPk: jestApi.fn() };
        const UserPassword = { update: jestApi.fn() };
        const createQueryLogger = jestApi.fn(() => jestApi.fn());
        const users = createUserRepository({ User, UserPassword, createQueryLogger });
        const passwords = createUserPasswordRepository({ UserPassword, createQueryLogger });
        const transaction = { id: 'transaction' };

        await users.findById('user-1', { transaction, lock: Transaction.LOCK.UPDATE });
        await passwords.updateByUserId(
            'user-1',
            { passwordHash: 'hash' },
            { transaction }
        );

        expect(User.findByPk).toHaveBeenCalledWith('user-1', expect.objectContaining({
            transaction,
            lock: Transaction.LOCK.UPDATE
        }));
        expect(UserPassword.update).toHaveBeenCalledWith(
            { passwordHash: 'hash' },
            expect.objectContaining({ transaction, where: { userId: 'user-1' } })
        );
    });

    test('MySQL generates SELECT FOR UPDATE for the user row', async () => {
        const sequelize = new Sequelize('test', 'test', 'test', {
            dialect: 'mysql',
            logging: false
        });
        const User = sequelize.define('User', {
            id: { type: DataTypes.UUID, primaryKey: true },
            email: DataTypes.STRING
        }, { tableName: 'users', timestamps: false });

        const query = sequelize.getQueryInterface().queryGenerator.selectQuery(
            User.getTableName(),
            {
                where: { id: 'user-1' },
                transaction: {},
                lock: Transaction.LOCK.UPDATE
            },
            User
        );

        expect(query).toMatch(/FOR UPDATE;$/);
        await sequelize.close();
    });
});
