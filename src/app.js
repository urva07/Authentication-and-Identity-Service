const config = require('./config/config');
const express = require('express');
const passport = require('passport');

const routes = require('./routes');
const middlewares = require('./middlewares');
const { recordRequestMetrics } = require('./monitoring/metrics');
const logger = require('./utils/logger');
const initializePassport = require('./config/passport');


const app = express();

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

app.use(middlewares.session({
    secret: config.session.secret,
    resave: config.session.resave,
    saveUninitialized: config.session.saveUninitialized,
    rolling: config.session.rolling,
    store: new (require('connect-redis').RedisStore)({
        client: require('./config').redis,
        ttl: config.session.store.redis.ttl,
    }),
    cookie: {
      maxAge: config.session.cookie.maxAge,
      httpOnly: config.session.cookie.httpOnly,
      secure: config.session.cookie.secure,
      sameSite: config.session.cookie.sameSite,
      path: config.session.cookie.path,
    }
}))

app.use(middlewares.json());
app.use(middlewares.urlencoded({ extended: true }));
app.use(middlewares.cookieParser());

app.use(middlewares['abort-signal.middleware']);

app.use(passport.initialize());
app.use(passport.session());
initializePassport();

app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is healthy'
    });
});

app.use('/health', routes.healthRoutes);

app.use('/api/v1', routes.v1Routes);

app.use(middlewares['notFound.middleware']);

app.use(middlewares['error.middleware']);


module.exports = app;
