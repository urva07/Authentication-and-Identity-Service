const keyGeneratorsKeys = {
    IP: 'ip',
    ANONYMOUS_ACCOUNT: 'anonymousAccount',
    TOKEN: 'token',
    QUERY_TOKEN: 'queryToken',
    USER: 'user',

}

const authBasePath = {
    v1: '/v1/auth'
}

const v1 = {
    [`${authBasePath.v1}/login`]: {
        windowMs: 1 * 60 * 1000,
        limit: 3,
        keyGenerator: keyGeneratorsKeys.ANONYMOUS_ACCOUNT
    },
    [`${authBasePath.v1}/signup`]: {
        windowMs: 1 * 60 * 1000,
        limit: 3,
        keyGenerator: keyGeneratorsKeys.ANONYMOUS_ACCOUNT
    },
    [`${authBasePath.v1}/forgot-password`]: {
        windowMs: 1 * 60 * 1000,
        limit: 2,
        keyGenerator: keyGeneratorsKeys.ANONYMOUS_ACCOUNT
    },
    [`${authBasePath.v1}/reset-password`]: {
        windowMs: 1 * 60 * 1000,
        limit: 2,
        keyGenerator: keyGeneratorsKeys.QUERY_TOKEN
    },
    [`${authBasePath.v1}/logout`]: {
        windowMs: 5 * 60 * 1000,
        limit: 5,
        keyGenerator: keyGeneratorsKeys.USER
    },
    [`${authBasePath.v1}/refresh`]: {
        windowMs: 15 * 60 * 1000,
        limit: 5,
        keyGenerator: keyGeneratorsKeys.TOKEN
    },
    [`${authBasePath.v1}/verify`]: {
        windowMs: 1 * 60 * 1000,
        limit: 10,
        keyGenerator: keyGeneratorsKeys.TOKEN
    },
    [`${authBasePath.v1}/verify-email`]: {
        windowMs: 1 * 60 * 1000,
        limit: 3,
        keyGenerator: keyGeneratorsKeys.TOKEN
    },
    [`${authBasePath.v1}/oidc/goole`]: {
        windowMs: 1 * 60 * 1000,
        limit: 3,
        keyGenerator: keyGeneratorsKeys.IP
    },
    [`${authBasePath.v1}/oidc/goole/callback`]: {
        windowMs: 1 * 60 * 1000,
        limit: 10,
        keyGenerator: keyGeneratorsKeys.IP
    }
};

const rateLimitConfig = {
    v1
}


module.exports = {
    rateLimitConfig,
    keyGeneratorsKeys
}