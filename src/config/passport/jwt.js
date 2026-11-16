const {Strategy: JwtStrategy, ExtractJwt} = require('passport-jwt');
const config = require('../config');
const { mysql: { getUserRepository } } = require('#src/repositories/index.js');
const logger = require('#src/utils/logger.js');
const { AuthenticationError } = require('#src/errors/index.js');
const requestCoalescer = require('#src/lib/requestCoalescer.js')
const { createCoalescingKey } = require('#src/lib/index.js');


const createJwtAuthenticationCallback = ({
    userRepository
} = {}) => {
    const coalescingKey = createCoalescingKey({
        db: "mysql",
        repository: "userRepository",
        method: "findById"
    });

    return async (payload, done) => {
        try {
            logger.debug('[passport-jwt] Looking up user for JWT authentication');
            userRepository = userRepository || getUserRepository();
            const args = [payload.sub]
            const user = await requestCoalescer(
                coalescingKey(args),
                () => userRepository.findById(...args),
                logger
            );

            if (!user) {
                logger.debug('[passport-jwt] JWT authentication rejected: user was not found');
                return done(new AuthenticationError("Invalid token"));
            }

            logger.debug('[passport-jwt] JWT authentication user lookup succeeded');
            return done(null, user);
        } catch (error) {
            logger.debug('[passport-jwt] JWT authentication user lookup failed');
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