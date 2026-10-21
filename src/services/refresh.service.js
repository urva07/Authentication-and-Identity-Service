const jwtClient = require('jsonwebtoken');
const { AppError, AuthenticationError } = require('../errors');
const config = require('../config/config');
const { TOKEN_EXPIRY_SECONDS } = require('../constants/auth');

const createRefreshService = ({
    jwt = jwtClient,
    jwtSecret
} = {}) => ({
    refreshAccessToken: (user) => {
        if (!user || user.id === undefined || user.id === null) {
            throw new AuthenticationError();
        }

        const signingSecret = jwtSecret || config.auth.jwtSecret;
        if (!signingSecret || Buffer.byteLength(signingSecret) < 32) {
            throw new AppError(
                'Authentication requires a JWT secret of at least 32 bytes',
                500
            );
        }

        return jwt.sign(
            { sub: String(user.id) },
            signingSecret,
            { expiresIn: TOKEN_EXPIRY_SECONDS }
        );
    }
});

module.exports = createRefreshService;
