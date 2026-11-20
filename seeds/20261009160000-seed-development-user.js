'use strict';

const bcrypt = require('bcryptjs');
const initializeModels = require('../src/models');

const EMAIL = 'development@gmail.com';
const PASSWORD = 'Development123!';

module.exports = {
    async up(queryInterface) {
        const { User, UserPassword, IdentityProvider } =
            initializeModels(queryInterface.sequelize);

        await queryInterface.sequelize.transaction(async (transaction) => {
            const user = await User.create(
                {
                    email: EMAIL,
                    firstName: 'Development',
                    lastName: 'User',
                    phone: '+15555550100',
                    dateOfBirth: '1990-01-01',
                    gender: 'unspecified',
                    profilePhoto: 'https://example.com/development-user.png',
                    profileCompleted: true
                },
                { transaction }
            );

            await UserPassword.create(
                {
                    userId: user.id,
                    passwordHash: await bcrypt.hash(PASSWORD, 10)
                },
                { transaction }
            );

            await IdentityProvider.create(
                {
                    userId: user.id,
                    provider: 'google',
                    providerUserId: 'development-user'
                },
                { transaction }
            );
        });
    },

    async down(queryInterface) {
        const { User } = initializeModels(queryInterface.sequelize);

        await User.destroy({
            where: { email: EMAIL }
        });
    }
};
