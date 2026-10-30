const { DataTypes } = require('sequelize');

const defineUser = (sequelize) =>
    sequelize.define(
        'User',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            email: {
                type: DataTypes.STRING(320),
                allowNull: true,
                unique: true,
                validate: {
                    isEmail: true
                }
            },
            firstName: {
                type: DataTypes.STRING(100),
                allowNull: true
            },
            lastName: {
                type: DataTypes.STRING(100),
                allowNull: true
            },
            phone: {
                type: DataTypes.STRING(30),
                allowNull: true,
                unique: true
            },
            dateOfBirth: {
                type: DataTypes.DATEONLY,
                allowNull: true
            },
            gender: {
                type: DataTypes.STRING(30),
                allowNull: true
            },
            profilePhoto: {
                type: DataTypes.STRING(500),
                allowNull: true
            },
            profileCompleted: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            }
        },
        {
            tableName: 'users',
            timestamps: true,
            underscored: true
        }
    );

module.exports = defineUser;
