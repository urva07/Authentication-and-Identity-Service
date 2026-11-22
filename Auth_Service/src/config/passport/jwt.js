const {Strategy: JwtStrategy, ExtractJwt} = require('passport-jwt');
const config = require('../config');
const {
    mysql: {
        getUserRepository
    },
    redis: {
        userCacheInstance: {
            getUserExistenceRepository
        },
        sessionInstance: {
            getUserLockRepository
        }
    }
} = require('#src/repositories/index.js');
const logger = require('#src/utils/logger.js');
const { AuthenticationError } = require('#src/errors/index.js');
const requestCoalescer = require('#src/lib/requestCoalescer.js')
const { createCoalescingKey } = require('#src/lib/index.js');
const { cacheAuthenticatedUser } = require('#src/lib/index.js');
const { COALESCING, JWT_CLAIMS } = require('#src/constants/index.js');


const createJwtAuthenticationCallback = ({
    userRepository,
    userExistenceRepository,
    userLockRepository
} = {}) => {
    const coalescingKey = createCoalescingKey({
        db: COALESCING.DATABASES.MYSQL,
        repository: COALESCING.MYSQL.REPOSITORIES.USER,
        method: COALESCING.MYSQL.METHODS.USER.FIND_BY_ID
    });

    return async (payload, done) => {
        try {
            logger.debug('[passport-jwt] Looking up user for JWT authentication');

            if (!payload[JWT_CLAIMS.SUBJECT]) {
                return done(new AuthenticationError("No sub received on payload"));
            }
            const userId = payload[JWT_CLAIMS.SUBJECT];

            const fetchUser = async () => {
                userRepository = userRepository || getUserRepository();
                userExistenceRepository = userExistenceRepository || getUserExistenceRepository();
                userLockRepository = userLockRepository || getUserLockRepository();

                logger.debug({ userId }, '[passport-jwt] Checking user existence from cache');

                let cachedUserExist;
                try {
                    cachedUserExist = await userExistenceRepository.getById(userId);
                } catch (error) {
                    logger.error({ userId, err: error }, '[passport-jwt] Failed to fetch user from cache');
                }

                if (cachedUserExist) {
                    logger.debug({ userId }, '[passport-jwt] Cache hit for user');
                    return { id: userId }
                }
                logger.debug({ userId }, '[passport-jwt] Cache miss for user');

                logger.debug({ userId }, '[passport-jwt] Fetching user from database');
                const user = await userRepository.findById(userId);

                if (user) {
                    logger.debug({ userId }, '[passport-jwt] User fetched from database');
                    await cacheAuthenticatedUser(
                        {
                            userExistenceRepository,
                            userLockRepository
                        },
                        user.id,
                        logger
                    )

                    return { id: userId };
                }

                logger.debug({ userId }, '[passport-jwt] User not found from database');
                return null;
            }
            
            const user = await requestCoalescer(
                coalescingKey([userId]),
                fetchUser,
                logger
            );

            if (!user) {
                logger.debug('[passport-jwt] JWT authentication rejected: user was not found');
                return done(new AuthenticationError("Invalid token"));
            }

            logger.debug('[passport-jwt] JWT authentication user lookup succeeded');
            return done(null, user);
        } catch (error) {
            logger.debug('[passport-jwt] JWT authentication user lookup failed due to unknown error');
            return done(error);
        }
    }
}

const buildJwtStrategy = ({
    tokenExtractor,
    secret,
    userExtractor,
    algorithms = config.auth.jwt.jwtAlgorithm
}) => new JwtStrategy(
    {
        jwtFromRequest: tokenExtractor,
        secretOrKey: secret,
        algorithms: algorithms,
    },
    userExtractor
);

const allowedFrom = ['header', 'cookie'];

const createJwtStrategy = (
    tokenSecret,
    from, 
    cookieName
) => {
    if (!allowedFrom.includes(from)) {
        throw new TypeError("from argument must be either 'header' or 'cookie'");
    }
    from = from.toLowerCase();
    if (from === 'cookie' && !cookieName) {
        throw new TypeError("cookieName must be provided when 'from' is 'cookie'");
    }
    if (!tokenSecret) {
        throw new TypeError("tokenSecret must be provided");
    }

    return buildJwtStrategy({
        tokenExtractor: 
            from === 'header' 
                ? ExtractJwt.fromAuthHeaderAsBearerToken() 
                : ExtractJwt.fromExtractors([
                    (req) => {
                        let token = null;
                        if (req && req.cookies) {
                            token = req.cookies[cookieName];
                        }
                        logger.debug(`JWT cookie token ${token ? 'found' : 'not found'}`);
                        return token;
                    }
                ]),
        secret: tokenSecret,
        userExtractor: createJwtAuthenticationCallback()
    });
};


module.exports = {
    jwtStrategy: createJwtStrategy,
    jwtAuthenticationCallback: createJwtAuthenticationCallback
};