const { AuthenticationError } = require('../errors');
const { getUserRepository } = require('../repositories');

const createVerifyService = ({ userRepository } = {}) => {
    if (
        userRepository !== undefined &&
        typeof userRepository?.findById !== 'function'
    ) {
        throw new TypeError('Verify service requires a user repository');
    }

    const verifyUser = async (userId) => {
        const repository = userRepository || getUserRepository();
        const user = await repository.findById(userId);

        if (!user) {
            throw new AuthenticationError();
        }

        return {
            id: String(user.id),
            email: user.email,
            phone: user.phone,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePhoto: user.profilePhoto,
            profileCompleted: user.profileCompleted
        };
    };

    return { verifyUser };
};

module.exports = createVerifyService;
