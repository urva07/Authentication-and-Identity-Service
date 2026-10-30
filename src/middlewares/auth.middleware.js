const { verifyJWTtoken } = require('#src/utils/jwt.js');
const { AuthenticationError } = require('#src/errors/index.js');
const config = require('#src/config/config.js');
const { getUserRepository } = require('#src/repositories/index.js');
const logger = require('#src/utils/logger.js');


const authenticationSources = ['header', 'cookie'];
const tokenTypes = ['access', 'refresh'];

const authenticate = (source, tokenType = 'access') => {
    if (!authenticationSources.includes(source)) {
        throw new TypeError(
            `Authentication source must be one of: ${authenticationSources.join(', ')}`
        );
    }

    if (!tokenTypes.includes(tokenType.toLowerCase())) {
        throw new TypeError(
            `Token type must be one of: ${tokenTypes.join(', ')}`
        );
    }

    tokenType = tokenType.toLowerCase();

    return async (req, res, next) => {
        logger.debug('Authenticating request.', { source, tokenType });
        let token;

        if (source === 'header') {
            const authorization = req.headers?.authorization;
            const bearerMatch = typeof authorization === 'string'
                ? authorization.trim().match(/^Bearer\s+(\S+)$/i)
                : null;
            token = bearerMatch?.[1];
        } else {
            token = req.cookies?.[tokenType === 'access'? config.auth.jwt.jwtAccessTokenCookieName : config.auth.jwt.jwtRefreshTokenCookieName];
        }

        if (!token) {
            logger.debug('Authentication token was not found.', { source, tokenType });
            return next(new AuthenticationError());
        }

        const jwtSecret = tokenType === 'access'
            ? config.auth.jwt.jwtAccessTokenSecret
            : config.auth.jwt.jwtRefreshTokenSecret;

        if (!jwtSecret || Buffer.byteLength(jwtSecret) < 32) {
            logger.debug('Authentication failed because the JWT secret is invalid.', { tokenType });
            return next(
                new Error('Invalid JWT secret.')
            );
        }

        try {
            logger.debug('Verifying authentication token.', { tokenType });
            const payload = verifyJWTtoken({
                token: token, 
                secret: jwtSecret
            });
            const userId = payload.sub;

            const userRepository = getUserRepository();
            const user = await userRepository.findById(userId);

            if (!user) {
                logger.debug('Authentication failed because the token user was not found.', { tokenType });
                return next(new AuthenticationError());
            }

            req.user = user;
            logger.debug('Authentication succeeded.', { tokenType });
            
            return next();

        } catch (error) {
            if (error.name === 'JsonWebTokenError') {
                logger.debug('Authentication failed because the token is invalid.', { tokenType });
                return next(new AuthenticationError());
            }

            logger.debug('Authentication failed with an unexpected error.', {
                tokenType,
                errorName: error.name
            });
            return next(error);
        }
    };
};


module.exports = authenticate;
