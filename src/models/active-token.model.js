const { DataTypes } = require('sequelize');


const defineActiveToken = (sequelize) =>
    sequelize.define('ActiveToken', {
        tokenType: {
            type: DataTypes.STRING(64),
            allowNull: false,
            primaryKey: true
        },
        jti: {
            type: DataTypes.UUID,
            allowNull: false,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: true
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false
        }
    }, {
        tableName: 'active_tokens',
        timestamps: true,
        updatedAt: false,
        underscored: true
    });


module.exports = defineActiveToken;
