const {Strategy: JwtStrategy, ExtractJwt} = require('passport-jwt');
const config = require('../config');
const { getUserRepository } = require('#src/repositories/index.js');
const logger = require('#src/utils/logger.js');

const userExtractor = async (payload, done) => {
    try {
        const userId = payload.sub;
        logger.debug('Looking up user for JWT authentication');
        const userRepository = getUserRepository();
        const user = await userRepository.findById(userId);

        if (!user) {
            logger.debug('JWT authentication rejected: user was not found');
            return done(null, false);
        }

        logger.debug('JWT authentication user lookup succeeded');
        return done(null, user);
    } catch (error) {
        logger.debug('JWT authentication user lookup failed');
        return done(error, false);
    }
};

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
        userExtractor
    });
};

module.exports = {
    jwtStrategy: createJwtStrategy
};