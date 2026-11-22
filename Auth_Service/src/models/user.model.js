const { DataTypes } = require('sequelize');
const { VALIDATION_LIMITS } = require('#src/constants/index.js');

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
                type: DataTypes.STRING(VALIDATION_LIMITS.NAME_MAX_LENGTH),
                allowNull: true
            },
            lastName: {
                type: DataTypes.STRING(VALIDATION_LIMITS.NAME_MAX_LENGTH),
                allowNull: true
            },
            phone: {
                type: DataTypes.STRING(VALIDATION_LIMITS.PHONE_MAX_LENGTH),
                allowNull: true,
                unique: true
            },
            dateOfBirth: {
                type: DataTypes.DATEONLY,
                allowNull: true
            },
            gender: {
                type: DataTypes.STRING(VALIDATION_LIMITS.GENDER_MAX_LENGTH),
                allowNull: true
            },
            profilePhoto: {
                type: DataTypes.STRING(VALIDATION_LIMITS.PROFILE_PHOTO_MAX_LENGTH),
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
