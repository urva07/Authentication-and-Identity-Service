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
        port: Number(process.env.PORT) || 3000,
        apiBaseUrl: process.env.API_BASE_URL || `http://localhost:${Number(process.env.PORT) || 3000}`,
        corsOrigin: process.env.CORS_ORIGIN,
        externalApiTimeoutMs
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
        jwtSecret: process.env.JWT_SECRET,
        signinTokenSecret: process.env.SIGNIN_TOKEN_SECRET
    },
    oidc: {
        google: {
            clientId: process.env.OIDC_GOOGLE_CLIENT_ID,
            clientSecret: process.env.OIDC_GOOGLE_CLIENT_SECRET,
            callbackUrl: process.env.OIDC_GOOGLE_CALLBACK_URL,
            scope: process.env.OIDC_GOOGLE_SCOPE || 'openid email profile'
        }
    },
    email: {
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASSWORD,
        from: process.env.EMAIL_FROM
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
    }
};