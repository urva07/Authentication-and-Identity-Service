const { rateLimitConfig, keyGeneratorsKeys } = require('#src/constants/index.js');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { 
    dbs: { 
        redis: {
            redisRateLimiterClient
        }
    } 
} = require('#src/infrastructure/database/index.js');
const { RedisStore } = require('rate-limit-redis');


const getIpKey = (req) => ipKeyGenerator(req.ip);

const keyGenerators = {
    [keyGeneratorsKeys.IP]: getIpKey,
    [keyGeneratorsKeys.TOKEN]: (req) => req.headers['authorization'] ? `token:${req.headers['authorization']}` : getIpKey(req),
    [keyGeneratorsKeys.QUERY_TOKEN]: (req) => req.query['token'] ? `queryToken:${req.query['token']}` : getIpKey(req),
    [keyGeneratorsKeys.USER]: (req) => req.user?.id ? `user:${req.user.id}` : getIpKey(req),
    [keyGeneratorsKeys.ANONYMOUS_ACCOUNT]: (req) => req?.body?.email ? `anonymousAccount:${req.body.email}:${getIpKey(req)}` : getIpKey(req)
}

const derivedLimiters = {};

const createDerivedLimiter = () => {
    for (const [version, routes] of Object.entries(rateLimitConfig)) {
        derivedLimiters[version] = {};

        for (const [route, config] of Object.entries(routes)) {
            derivedLimiters[version][route] = rateLimit({
                windowMs: config.windowMs,
                limit: config.limit,
                keyGenerator: keyGenerators[config.keyGenerator],
                store: new RedisStore({
                    prefix: `rate-limit:${route}:`,
                    sendCommand: async (...args) => {
                        return redisRateLimiterClient.sendCommand(args);
                    }
                })
            });
        }
    }
}

const dynamicRateLimiter = (req, res, next) => {
    const version = req.path.split('/')[1];
    const limiter = derivedLimiters[version]?.[req.path];
    if (limiter) {
        req.log.debug(`Derived Rate limiter hit for: ${req.method} ${req.originalUrl || req.path}`);
        return limiter(req, res, next);
    }
    req.log.debug(`No Derived Rate limiter hit for: ${req.method} ${req.originalUrl || req.path}`);
    next();
}


module.exports = {
    createDerivedLimiter,
    dynamicRateLimiter
};