const defineIdentityProvider = require('./identity-provider.model');
const defineUser = require('./user.model');
const defineUserPassword = require('./user-password.model');

const initializeModels = (sequelize) => {
    const User = defineUser(sequelize);
    const UserPassword = defineUserPassword(sequelize);
    const IdentityProvider = defineIdentityProvider(sequelize);

    User.hasOne(UserPassword, {
        as: 'password',
        foreignKey: 'userId'
    });
    UserPassword.belongsTo(User, {
        as: 'user',
        foreignKey: 'userId'
    });

    User.hasMany(IdentityProvider, {
        as: 'identityProviders',
        foreignKey: 'userId'
    });
    IdentityProvider.belongsTo(User, {
        as: 'user',
        foreignKey: 'userId'
    });

    return { User, UserPassword, IdentityProvider };
};

module.exports = initializeModels;
