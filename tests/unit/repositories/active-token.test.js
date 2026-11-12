const { describe, test, jest: jestApi, expect } = require('@jest/globals');
const { Op, Sequelize } = require('sequelize');
const createActiveTokenRepository = require('../../../src/repositories/mysql/activeToken.repository');
const defineActiveToken = require('../../../src/models/active-token.model');

describe('active token repository', () => {
    test('deletes only an unexpired matching user, type, and token inside the transaction', async () => {
        const ActiveToken = { destroy: jestApi.fn().mockResolvedValue(1) };
        const tokens = createActiveTokenRepository({
            ActiveToken,
            createQueryLogger: () => jestApi.fn()
        });
        const transaction = {};
        const criteria = { tokenType: 'password-reset', jti: 'id', userId: 'user-id' };

        await expect(tokens.consume(criteria, { transaction })).resolves.toBe(1);
        const options = ActiveToken.destroy.mock.calls[0][0];
        expect(options.transaction).toBe(transaction);
        expect(options.where).toMatchObject(criteria);
        expect(options.where.expiresAt[Op.gt].fn).toBe('NOW');
    });

    test('model uses the migration columns and composite primary key', async () => {
        const sequelize = new Sequelize('test', 'test', 'test', {
            dialect: 'mysql',
            logging: false
        });
        const model = defineActiveToken(sequelize);

        expect(model.getTableName()).toBe('active_tokens');
        expect(model.primaryKeyAttributes).toEqual(['tokenType', 'jti']);
        expect(model.rawAttributes.userId.field).toBe('user_id');
        expect(model.rawAttributes.expiresAt.field).toBe('expires_at');
        expect(model.rawAttributes.createdAt.field).toBe('created_at');
        expect(model.rawAttributes.updatedAt).toBeUndefined();
        const sql = sequelize.getQueryInterface().queryGenerator.deleteQuery(
            model.getTableName(),
            {
                token_type: 'password-reset',
                jti: 'id',
                user_id: 'user-id',
                expires_at: { [Op.gt]: sequelize.fn('NOW') }
            },
            {}
        );
        expect(sql).toContain('`token_type` = \'password-reset\'');
        expect(sql).toContain('`user_id` = \'user-id\'');
        expect(sql).toContain('`expires_at` > NOW()');
        await sequelize.close();
    });
});
