'use strict';

const { DataTypes, Sequelize } = require('sequelize');

module.exports = {
    async up(queryInterface) {
        await queryInterface.createTable('active_tokens', {
            token_type: {
                type: DataTypes.STRING(64),
                allowNull: false,
                primaryKey: true
            },
            jti: {
                type: DataTypes.UUID,
                allowNull: false,
                primaryKey: true
            },
            user_id: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            expires_at: {
                type: DataTypes.DATE,
                allowNull: false
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        await queryInterface.addIndex('active_tokens', ['user_id', 'token_type'], {
            name: 'active_tokens_user_type'
        });
        await queryInterface.addIndex('active_tokens', ['expires_at'], {
            name: 'active_tokens_expiry'
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('active_tokens');
    }
};
