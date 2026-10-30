require('dotenv').config({ quiet: true });

const mongo = {
    username: process.env.MONGO_USERNAME,
    password: process.env.MONGO_PASSWORD,
    host: process.env.MONGO_HOST,
    port: Number(process.env.MONGO_PORT) || 27017,
    database: process.env.MONGO_DB_NAME,
    authSource: process.env.MONGO_AUTH_SOURCE || 'admin'
};

const mysql = {
    username: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT) || 3306,
    database: process.env.MYSQL_DATABASE
};

const redis = {
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT) || 6379
};

const externalApiTimeoutMs = Number(
    process.env.EXTERNAL_API_TIMEOUT_MS || 10000
);
if (!Number.isInteger(externalApiTimeoutMs) || externalApiTimeoutMs <= 0) {
    throw new Error('EXTERNAL_API_TIMEOUT_MS must be a positive integer');
}

module.exports = {
    runtime: {
        db_connections: {}
    },
    healthApp: {
        port: Number(process.env.HEALTH_APP_PORT) || 3001
    },
    app: {
        environment: process.env.NODE_ENV || 'development',
        domain: process.env.DOMAIN || 'localhost',
        port: Number(process.env.PORT) || 3000,
        apiBaseUrl: process.env.API_BASE_URL || `http://localhost:${Number(process.env.PORT) || 3000}`,
        corsOrigin: process.env.CORS_ORIGIN,
        externalApiTimeoutMs,
        totalReqResCycleTimeOutMs: Number(process.env.TOTAL_REQ_RES_CYCLE_TIMEOUT_MS) || 15000,
        connectionKeepAliveTimeoutMs: Number(process.env.CONNECTION_KEEP_ALIVE_TIMEOUT_MS) || 20000,
        connectionInactivityTimeoutMs: Number(process.env.CONNECTION_INACTIVITY_TIMEOUT_MS) || 10000,
        reqHeadersTimeoutMs: Number(process.env.REQ_HEADERS_TIMEOUT_MS) || 5000,
        reqTimeoutMs: Number(process.env.REQ_TIMEOUT_MS) || 20000,
        maxConnections: Number(process.env.MAX_CONNECTIONS) || 1000,
        bodySizeLimit: process.env.BODY_SIZE_LIMIT || '100kb'

    },
    database: {
        mongo,
        mysql
    },
    redis: {
        ...redis,
        database: 0
    },
    auth: {
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
            jwtAccessTokenCookieExpirationMili: process.env.JWT_ACCESS_TOKEN_COOKIE_EXPIRATION_MILI,
            jwtRefreshTokenCookieExpirationMili: process.env.JWT_REFRESH_TOKEN_COOKIE_EXPIRATION_MILI,
            jwtRefreshTokenSecret: process.env.JWT_REFRESH_TOKEN_SECRET,
            jwtAccessTokenSecret: process.env.JWT_ACCESS_TOKEN_SECRET,
            jwtAlgorithm: process.env.JWT_ALGORITHM || 'HS256',
            jwtAccessTokenCookieName: process.env.JWT_ACCESS_TOKEN_COOKIE_NAME || 'accessToken',
            jwtRefreshTokenCookieName: process.env.JWT_REFRESH_TOKEN_COOKIE_NAME || 'refreshToken'
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
    },
    email: {
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASSWORD,
        from: process.env.EMAIL_FROM
    }
};