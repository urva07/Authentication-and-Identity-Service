'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
    async up(queryInterface) {
        await queryInterface.changeColumn('user_idps', 'provider', {
            type: DataTypes.ENUM('google'),
            allowNull: false
        });
    },

    async down(queryInterface) {
        await queryInterface.changeColumn('user_idps', 'provider', {
            type: DataTypes.STRING(50),
            allowNull: false
        });
    }
};
