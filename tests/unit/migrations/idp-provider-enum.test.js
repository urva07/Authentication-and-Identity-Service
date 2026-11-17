const { describe, test, jest: jestApi, expect } = require('@jest/globals');
const { DataTypes } = require('sequelize');
const migration = require('../../../migrations/20261117053000-change-idp-provider-to-enum');

describe('idp provider enum migration', () => {
    test('changes provider to a google-only enum and rolls back to a string', async () => {
        const queryInterface = { changeColumn: jestApi.fn().mockResolvedValue() };

        await migration.up(queryInterface);
        await migration.down(queryInterface);

        const [, upColumn, upDef] = queryInterface.changeColumn.mock.calls[0];
        const [, , downDef] = queryInterface.changeColumn.mock.calls[1];
        expect(queryInterface.changeColumn.mock.calls[0].slice(0, 2)).toEqual(['user_idps', 'provider']);
        expect(upColumn).toBe('provider');
        expect(upDef.type.values).toEqual(['google']);
        expect(upDef.allowNull).toBe(false);
        expect(downDef.type).toEqual(DataTypes.STRING(50));
    });
});
