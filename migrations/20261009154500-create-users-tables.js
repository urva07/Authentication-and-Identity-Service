'use strict';

const { DataTypes, Sequelize } = require('sequelize');

const timestamps = {
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
};

module.exports = {
    async up(queryInterface) {
        await queryInterface.createTable('users', {
            id: {
                type: DataTypes.UUID,
                allowNull: false,
                primaryKey: true
            },
            email: {
                type: DataTypes.STRING(320),
                allowNull: true
            },
            first_name: {
                type: DataTypes.STRING(100),
                allowNull: true
            },
            last_name: {
                type: DataTypes.STRING(100),
                allowNull: true
            },
            phone: {
                type: DataTypes.STRING(30),
                allowNull: true
            },
            date_of_birth: {
                type: DataTypes.DATEONLY,
                allowNull: true
            },
            gender: {
                type: DataTypes.STRING(30),
                allowNull: true
            },
            profile_photo: {
                type: DataTypes.STRING(500),
                allowNull: true
            },
            profile_completed: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            ...timestamps
        });

        await queryInterface.addIndex('users', ['email'], {
            unique: true,
            name: 'unique_users_email'
        });
        await queryInterface.addIndex('users', ['phone'], {
            unique: true,
            name: 'unique_users_phone'
        });

        await queryInterface.createTable('user_passwords', {
            id: {
                type: DataTypes.BIGINT.UNSIGNED,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true
            },
            user_id: {
                type: DataTypes.UUID,
                allowNull: false,
                unique: true,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            password_hash: {
                type: DataTypes.STRING(255),
                allowNull: false
            },
            ...timestamps
        });

        await queryInterface.createTable('user_idps', {
            id: {
                type: DataTypes.BIGINT.UNSIGNED,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true
            },
            user_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            provider: {
                type: DataTypes.STRING(50),
                allowNull: false
            },
            provider_user_id: {
                type: DataTypes.STRING(255),
                allowNull: false
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        await queryInterface.addIndex(
            'user_idps',
            ['provider', 'provider_user_id'],
            {
                unique: true,
                name: 'unique_idp'
            }
        );
    },

    async down(queryInterface) {
        await queryInterface.dropTable('user_idps');
        await queryInterface.dropTable('user_passwords');
        await queryInterface.dropTable('users');
    }
};
