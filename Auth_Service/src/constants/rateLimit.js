const keyGeneratorsKeys = {
    IP: 'ip',
    ANONYMOUS_ACCOUNT: 'anonymousAccount',
    TOKEN: 'token',
    QUERY_TOKEN: 'queryToken',
    USER: 'user'
}

const v1 = {
    '/v1/auth/login': {
        windowMs: 15 * 60 * 1000,
        limit: 5,
        keyGenerator: keyGeneratorsKeys.ANONYMOUS_ACCOUNT
    },
    '/v1/auth/signup': {
        windowMs: 60 * 60 * 1000,
        limit: 3,
        keyGenerator: keyGeneratorsKeys.ANONYMOUS_ACCOUNT
    },
    '/v1/auth/forgot-password': {
        windowMs: 30 * 60 * 1000,
        limit: 5,
        keyGenerator: keyGeneratorsKeys.ANONYMOUS_ACCOUNT
    },
    '/v1/auth/reset-password': {
        windowMs: 30 * 60 * 1000,
        limit: 5,
        keyGenerator: keyGeneratorsKeys.QUERY_TOKEN
    },
    '/v1/auth/logout': {
        windowMs: 15 * 60 * 1000,
        limit: 5,
        keyGenerator: keyGeneratorsKeys.USER
    },
    '/v1/auth/refresh': {
        windowMs: 15 * 60 * 1000,
        limit: 5,
        keyGenerator: keyGeneratorsKeys.TOKEN
    },
    '/v1/auth/verify': {
        windowMs: 15 * 60 * 1000,
        limit: 5,
        keyGenerator: keyGeneratorsKeys.TOKEN
    },
    '/v1/auth/verify-email': {
        windowMs: 15 * 60 * 1000,
        limit: 5,
        keyGenerator: keyGeneratorsKeys.TOKEN
    }
};

const rateLimitConfig = {
    v1
}


module.exports = {
    rateLimitConfig,
    keyGeneratorsKeys
}