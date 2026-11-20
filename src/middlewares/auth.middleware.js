const { verifyJWTtoken } = require('#src/utils/jwt.js');
const { AuthenticationError } = require('#src/errors/index.js');
const config = require('#src/config/config/index.js');
const { 
    mysql: { 
        getUserRepository 
    } 
} = require('#src/repositories/index.js');
let logger = require('#src/utils/logger.js');
const requestCoalescer = require('#src/lib/requestCoalescer.js')
const { createCoalescingKey } = require('#src/lib/index.js');
const { AUTH_TOKENS, COALESCING, JWT_CLAIMS } = require('#src/constants/index.js');


const authenticationSources = ['header', 'cookie'];
const tokenTypes = [AUTH_TOKENS.ACCESS, AUTH_TOKENS.REFRESH];

const authenticate = ({
    source, 
    tokenType = AUTH_TOKENS.ACCESS,
    userRepository
}) => {
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
    
    const createTokenExtractor = () => {
        if (source === 'header') {
            return (req) => {
                const authorization = req.headers?.authorization;
                const bearerMatch = typeof authorization === 'string'
                    ? authorization.trim().match(/^Bearer\s+(\S+)$/i)
                    : null;
                return bearerMatch?.[1];
            };
        }
        return (req) => req.cookies?.[
            tokenType === AUTH_TOKENS.ACCESS
                ? config.auth.jwt.cookieOptions.access.name
                : config.auth.jwt.cookieOptions.refresh.name
        ];
    }
    const extractToken = createTokenExtractor();

    const coalescingKey = createCoalescingKey({
        db: COALESCING.DATABASES.MYSQL,
        repository: COALESCING.MYSQL.REPOSITORIES.USER,
        method: COALESCING.MYSQL.METHODS.USER.FIND_BY_ID
    });

    return async (req, res, next) => {
        logger = req.log || logger;
        logger.debug('Authenticating request.', { source, tokenType });

        const token = extractToken(req);

        if (!token) {
            logger.debug('Authentication token was not found.', { source, tokenType });
            return next(new AuthenticationError());
        }

        const jwtSecret = tokenType === AUTH_TOKENS.ACCESS
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
            userRepository = userRepository || getUserRepository();
            const args = [payload[JWT_CLAIMS.SUBJECT]];

            const user = await requestCoalescer(
                coalescingKey(args),
                () => userRepository.findById(...args),
                logger
            );

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