const express = require('express');
const { healthAppRoutes: routes } = require('./routes');
const { Registry, collectDefaultMetrics } = require('@prometheus-io/client');
const logger = require('./utils/logger');
const middlewares = require('./middlewares');
const { recordRequestMetrics } = require('./monitoring');


const app = express();
const metricsRegistry = new Registry();

collectDefaultMetrics({ register: metricsRegistry });

app.use(middlewares.pinoHttp({
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
}));

app.use('/', routes)


module.exports = app;
