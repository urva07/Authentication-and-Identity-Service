const defaultLogger = require('#src/utils/logger.js');

const createGoogleCallbackService = () => async (user, logger=defaultLogger) => {
    return user;
};

module.exports = createGoogleCallbackService;