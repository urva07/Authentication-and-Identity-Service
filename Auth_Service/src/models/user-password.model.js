const { DataTypes } = require('sequelize');

const defineUserPassword = (sequelize) =>
    sequelize.define(
        'UserPassword',
        {
            id: {
                type: DataTypes.BIGINT.UNSIGNED,
                autoIncrement: true,
                primaryKey: true
            },
            userId: {
                type: DataTypes.UUID,
                allowNull: false,
                unique: true
            },
            passwordHash: {
                type: DataTypes.STRING(255),
                allowNull: false
            }
        },
        {
            tableName: 'user_passwords',
            timestamps: true,
            underscored: true
        }
    );

module.exports = defineUserPassword;
