const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('../errors');
const config = require('../config/config');
const { AUTH_COOKIE_NAME } = require('../constants/auth');

const authenticationSources = ['authorization', 'cookie'];

const authenticate = (source) => {
    if (!authenticationSources.includes(source)) {
        throw new TypeError(
            `Authentication source must be one of: ${authenticationSources.join(', ')}`
        );
    }

    return (req, res, next) => {
        let token;

        if (source === 'authorization') {
            const authorization = req.headers?.authorization;
            const bearerMatch = typeof authorization === 'string'
                ? authorization.trim().match(/^Bearer\s+(\S+)$/i)
                : null;
            token = bearerMatch?.[1];
        } else {
            token = req.cookies?.[AUTH_COOKIE_NAME];
        }

        if (!token) {
            return next(new AuthenticationError());
        }

        const jwtSecret = config.auth.jwtSecret;
        if (!jwtSecret || Buffer.byteLength(jwtSecret) < 32) {
            return next(
                new AuthenticationError('Authentication is not configured', 500)
            );
        }

        try {
            const payload = jwt.verify(token, jwtSecret);
            req.user = { id: payload.sub };
            return next();
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                return next(new AuthenticationError());
            }

            return next(error);
        }
    };
};

module.exports = authenticate;
