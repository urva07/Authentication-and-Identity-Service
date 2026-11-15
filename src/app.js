const config = require('./config/config');
const express = require('express');
const passport = require('passport');
const { 
    mainAppRoutes: { 
        v1 
    } 
} = require('./routes');
const middlewares = require('./middlewares');
const { recordRequestMetrics } = require('./monitoring');
const logger = require('./utils/logger');
const { initializePassport } = require('./config/passport');
const { RedisStore } = require('connect-redis');
const { 
    dbs: 
        { 
            redis: { 
                redisSessionClient
            } 
        } 
} = require('#src/infrastructure/database/index.js');


const app = express();

initializePassport(session=true);

app.use(
    middlewares.pinoHttp({
        logger,
        redact: [
            'req.headers.cookie',
            'req.headers.authorization',
            'req.headers.x-ingress-auth-secret',
            'res.headers.set-cookie'
        ],
        customLogLevel: (req, res, error) => {
            if (error || res.statusCode >= 500) {
                return 'error';
            }

            if (res.statusCode >= 400) {
                return 'warn';
            }

            return 'info';
        },
        customSuccessObject: (req, res, logObject) => {
            recordRequestMetrics(req, res, logObject.responseTime);
            return logObject;
        },
        customErrorObject: (req, res, error, logObject) => {
            recordRequestMetrics(req, res, logObject.responseTime);
            return logObject;
        }
    })
);

app.use(middlewares.helmet());

app.use(middlewares.cors({
    origin: config.services.frontend.baseUrl,
    methods: "*",
    allowedHeaders: "*",
    exposedHeaders: "*",
    credentials: true,
    maxAge: 3600
}));

app.use(middlewares.rateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10000 // limit each IP to 100 requests per windowMs
}));

app.use(middlewares.json({
    limit: config.apps.mainApp.bodySizeLimit // limit the body to 100kb
}));

app.use(middlewares.urlencoded({ 
    extended: true,
    limit: config.apps.mainApp.bodySizeLimit // limit the body to 100kb
}));

app.use(middlewares.cookieParser());

app.use(middlewares.session({
    secret: config.auth.session.secret,
    resave: config.auth.session.resave,
    saveUninitialized: config.auth.session.saveUninitialized,
    rolling: config.auth.session.rolling,
    store: new RedisStore({
        client: redisSessionClient
    }),
    cookie: {
        maxAge: config.auth.session.cookie.maxAge,
        httpOnly: config.auth.session.cookie.httpOnly,
        secure: config.auth.session.cookie.secure,
        sameSite: config.auth.session.cookie.sameSite,
        path: config.auth.session.cookie.path
    }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(middlewares['abort-signal.middleware']);

app.use('/v1', v1);

app.use(middlewares['notFound.middleware']);

app.use(middlewares['error.middleware']);


module.exports = app;