const jwtClient = require('jsonwebtoken');
const { AppError, AuthenticationError } = require('#src/errors/index.js');
const config = require('#src/config/config/index.js');
const defaultLogger = require('#src/utils/logger.js');

const createRefreshService = ({
    jwt = jwtClient,
    jwtSecret = config.auth.jwt.jwtAccessTokenSecret
} = {}) => ({
    refreshAccessToken: (user, logger = defaultLogger) => {
        logger.debug('Refreshing access token');

        if (!user || user.id === undefined || user.id === null) {
            logger.debug('Cannot refresh access token: user identity is missing');
            throw new AuthenticationError();
        }

        const signingSecret = jwtSecret || config.auth.jwt.jwtAccessTokenSecret;
        if (!signingSecret || Buffer.byteLength(signingSecret) < 32) {
            logger.debug('Cannot refresh access token: JWT signing secret is missing or too short');
            throw new AppError(
                'Authentication requires a JWT secret of at least 32 bytes',
                500
            );
        }

        const accessToken = jwt.sign(
            { sub: String(user.id) },
            signingSecret,
            { expiresIn: config.auth.jwt.jwtAccessTokenExpiration }
        );

        logger.debug('Access token refreshed successfully');
        return accessToken;
    }
});

module.exports = createRefreshService;
