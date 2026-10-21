const logger = require('../utils/logger');
const { AppError } = require('../errors');

module.exports = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const log = err instanceof AppError &&
        err.isOperational &&
        statusCode >= 400 &&
        statusCode < 500
        ? logger.warn.bind(logger)
        : logger.error.bind(logger);
    const loggableError =
        err.name === 'ValidationError' && Array.isArray(err.errors)
            ? {
                  name: err.name,
                  message: err.message,
                  errors: err.errors
              }
            : err;

    log(
        {
            err: loggableError,
            statusCode,
            method: req.method,
            url: req.originalUrl
        },
        'Request failed'
    );

    const response = {
        success: false,
        message: err.message || 'Internal Server Error'
    };

    if (err.errors) {
        response.errors = err.errors;
    }

    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
};
