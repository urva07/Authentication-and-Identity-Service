const { describe, test, jest: jestApi, expect } = require('@jest/globals');
const migration = require('../../../migrations/20261108144900-create-active-tokens-table');

describe('active tokens migration', () => {
    test('creates an allowlist with a composite primary key and cleanup indexes', async () => {
        const queryInterface = {
            createTable: jestApi.fn().mockResolvedValue(),
            addIndex: jestApi.fn().mockResolvedValue()
        };

        await migration.up(queryInterface);

        expect(queryInterface.createTable).toHaveBeenCalledTimes(1);
        const [table, columns] = queryInterface.createTable.mock.calls[0];
        expect(table).toBe('active_tokens');
        expect(columns.token_type).toMatchObject({ allowNull: false, primaryKey: true });
        expect(columns.jti).toMatchObject({ allowNull: false, primaryKey: true });
        expect(columns.user_id).toMatchObject({
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        });
        expect(columns.expires_at.allowNull).toBe(false);
        expect(columns.created_at.allowNull).toBe(false);
        expect(queryInterface.addIndex).toHaveBeenCalledWith(
            'active_tokens',
            ['user_id', 'token_type'],
            { name: 'active_tokens_user_type' }
        );
        expect(queryInterface.addIndex).toHaveBeenCalledWith(
            'active_tokens',
            ['expires_at'],
            { name: 'active_tokens_expiry' }
        );
    });

    test('rolls back by dropping the allowlist table', async () => {
        const queryInterface = { dropTable: jestApi.fn().mockResolvedValue() };

        await migration.down(queryInterface);

        expect(queryInterface.dropTable).toHaveBeenCalledWith('active_tokens');
    });
});
