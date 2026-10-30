const config = require('./config/config');
const express = require('express');
const passport = require('passport');
const { mainAppRoutes: { v1 } } = require('./routes');
const middlewares = require('./middlewares');
const { recordRequestMetrics } = require('./monitoring/metrics');
const logger = require('./utils/logger');
const { initializePassport } = require('./config/passport');


const app = express();

initializePassport(session=true);

app.use(
    middlewares.pinoHttp({
        logger,
        redact: [
            'req.headers.cookie',
            'req.headers.authorization',
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

app.use(
    config.app.corsOrigin
        ? middlewares.cors({
            origin: config.app.corsOrigin,
            credentials: true
        })
        : middlewares.cors()
);

app.use(middlewares.rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
}));

app.use(middlewares.json({
    limit: config.app.bodySizeLimit // limit the body to 100kb
}));
app.use(middlewares.urlencoded({ 
    extended: true,
    limit: config.app.bodySizeLimit // limit the body to 100kb
}));
app.use(middlewares.cookieParser());

app.use(middlewares.session({
    secret: config.auth.session.secret,
    resave: config.auth.session.resave,
    saveUninitialized: config.auth.session.saveUninitialized,
    rolling: config.auth.session.rolling,
    // store: new (require('connect-redis').RedisStore)({
    //     client: require('./infrastructure/database').redis,
    //     ttl: config.auth.session.store.redis.ttl
    // }),
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