const defaultLogger = require('#src/utils/logger.js');

const createLogoutService = () => ({
    logoutUser: (logger = defaultLogger) => {
        logger.debug('Stateless logout completed');
        return { loggedOut: true };
    }
});

module.exports = createLogoutService;
