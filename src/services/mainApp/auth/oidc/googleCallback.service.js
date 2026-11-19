const defaultLogger = require('#src/utils/logger.js');
const { AuthenticationError } = require('#src/errors/index.js');


const createGoogleCallbackService = (passportLoginService) => {
    if (!passportLoginService) {
        throw new Error('Passport Login Service is required');
    }

    const loginUser = async (user, logger = defaultLogger) => {
        if (!user) {
            logger.warn('No user provided to Google Callback Service. Please check the controller implementation and google OIDC authentication flow.');
            throw new AuthenticationError();
        }

        return passportLoginService.loginUser(user, logger);
    };

    return { loginUser };
};


module.exports = createGoogleCallbackService;