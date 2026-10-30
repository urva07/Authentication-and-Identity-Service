const { AuthenticationError } = require('../../../errors');
const { getUserRepository } = require('../../../repositories');
const logger = require('#src/utils/logger.js');

const createVerifyService = ({ userRepository } = {}) => {
    if (
        userRepository !== undefined &&
        typeof userRepository?.findById !== 'function'
    ) {
        throw new TypeError('Verify service requires a user repository');
    }

    const verifyUser = async (user) => {
        // const repository = userRepository || getUserRepository();
        // logger.debug('Verifying user');
        // const user = await repository.findById(userId);

        if (!user) {
            logger.debug('User not found. Did not receive user from authentication middleware');
            throw new AuthenticationError();
        }

        logger.debug('User found. Received user from authentication middleware');
        return user;
    };

    return { verifyUser };
};

module.exports = createVerifyService;
