const { AuthenticationError } = require('#src/errors/index.js');
const defaultLogger = require('#src/utils/logger.js');

const createVerifyService = () => {

    const verifyUser = async (user, logger = defaultLogger) => {

        if (!user) {
            logger.debug('Did not receive user from passport jwt strategy. The passport jwt strategy\'s verify callback is supposed to throw an error if authentication fails. Please check the strategy implementation.');
            throw new AuthenticationError("Invalid token");
        }

        logger.debug('User found. Received user from jwt strategy');
        return user;
    };

    return { verifyUser };
};

module.exports = createVerifyService;
