const { DataTypes } = require('sequelize');

const defineIdentityProvider = (sequelize) =>
    sequelize.define(
        'IdentityProvider',
        {
            id: {
                type: DataTypes.BIGINT.UNSIGNED,
                autoIncrement: true,
                primaryKey: true
            },
            userId: {
                type: DataTypes.UUID,
                allowNull: false
            },
            provider: {
                type: DataTypes.ENUM('google'),
                allowNull: false
            },
            providerUserId: {
                type: DataTypes.STRING(255),
                allowNull: false
            }
        },
        {
            tableName: 'user_idps',
            timestamps: true,
            updatedAt: false,
            underscored: true,
            indexes: [
                {
                    unique: true,
                    name: 'unique_idp',
                    fields: ['provider', 'provider_user_id']
                }
            ]
        }
    );

module.exports = defineIdentityProvider;
