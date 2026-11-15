module.exports = {
    ingress: {
        sharedSecret: process.env.INGRESS_SHARED_SECRET
    },
    session: {
        secret: process.env.SESSION_SECRET,
        resave: process.env.SESSION_RESAVE === 'true',
        saveUninitialized: process.env.SESSION_SAVE_UNINITIALIZED === 'true',
        rolling: process.env.SESSION_ROLLING === 'true',
        store: {
            redis: {
                ttl: Number(process.env.SESSION_REDIS_TTL) || 86400
            }
        },
        cookie: {
            domain: process.env.SESSION_COOKIE_DOMAIN || undefined,
            httpOnly: process.env.SESSION_COOKIE_HTTP_ONLY !== 'false',
            maxAge: Number(process.env.SESSION_COOKIE_MAX_AGE) || 86400000,
            path: process.env.SESSION_COOKIE_PATH || '/',
            sameSite: process.env.SESSION_COOKIE_SAME_SITE || 'lax',
            secure: process.env.SESSION_COOKIE_SECURE === 'true',
            priority: process.env.SESSION_COOKIE_PRIORITY || 'medium',
            partitioned: process.env.SESSION_COOKIE_PARTITIONED === 'true'
        }
    },
    jwt: {
        jwtSecret: process.env.JWT_SECRET,
        jwtRefreshTokenExpiration: process.env.JWT_REFRESH_TOKEN_EXPIRATION || '7d',
        jwtAccessTokenExpiration: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '24h',
        jwtRefreshTokenSecret: process.env.JWT_REFRESH_TOKEN_SECRET,
        jwtAccessTokenSecret: process.env.JWT_ACCESS_TOKEN_SECRET,
        jwtPasswordResetTokenSecret: process.env.JWT_PASSWORD_RESET_TOKEN_SECRET,
        jwtPasswordResetTokenTtlSeconds: Number(process.env.JWT_PASSWORD_RESET_TOKEN_TTL_SECONDS) || 900,
        jwtAlgorithm: process.env.JWT_ALGORITHM || 'HS256',
        cookieOptions: {
            refresh: {
                name: process.env.JWT_REFRESH_TOKEN_COOKIE_NAME || 'refreshToken',
                httpOnly: process.env.JWT_REFRESH_TOKEN_COOKIE_HTTP_ONLY !== 'false',
                secure: process.env.NODE_ENV === 'production' && process.env.JWT_REFRESH_TOKEN_COOKIE_SECURE === 'true',
                sameSite: process.env.JWT_REFRESH_TOKEN_COOKIE_SAME_SITE || 'strict',
                path: process.env.JWT_REFRESH_TOKEN_COOKIE_PATH || '/v1/auth/refresh',
                maxAge: process.env.JWT_REFRESH_TOKEN_COOKIE_EXPIRATION_MILI,
            },
            access: {
                name: process.env.JWT_ACCESS_TOKEN_COOKIE_NAME || 'accessToken',
                httpOnly: process.env.JWT_ACCESS_TOKEN_COOKIE_HTTP_ONLY || false,
                secure: process.env.NODE_ENV === 'production' && process.env.JWT_ACCESS_TOKEN_COOKIE_SECURE === 'true',
                sameSite: process.env.JWT_ACCESS_TOKEN_COOKIE_SAME_SITE || 'lax',
                path: process.env.JWT_ACCESS_TOKEN_COOKIE_PATH || '/',
                maxAge: process.env.JWT_ACCESS_TOKEN_COOKIE_EXPIRATION_MILI,
            }
        }
    },
    basic: {
        hashSaltRounds: Number(process.env.BASIC_HASH_SALT_ROUNDS) || 10,
        signinAes256GcmTokenSecret: process.env.BASIC_SIGNIN_AES_256_GCM_TOKEN_SECRET,
        signinAes256GcmTokenTtlSeconds: Number(process.env.BASIC_SIGNIN_AES_256_GCM_TOKEN_TTL_SECONDS) || 1800
    },
    oidc: {
        google: {
            clientId: process.env.OIDC_GOOGLE_CLIENT_ID,
            clientSecret: process.env.OIDC_GOOGLE_CLIENT_SECRET,
            callbackUrl: process.env.OIDC_GOOGLE_CALLBACK_URL,
            scope: process.env.OIDC_GOOGLE_SCOPE || 'openid email profile'
        }
    }
}