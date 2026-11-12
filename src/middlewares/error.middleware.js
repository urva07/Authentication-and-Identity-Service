const { AppError, PayloadTooLargeError } = require('../errors');


const INTERNAL_SERVER_ERROR_MESSAGE = 'Internal Server Error';

module.exports = (err, req, res, next) => {
    if (err.type === 'entity.too.large') {
        err = new PayloadTooLargeError();
    }

    const isAppError = err instanceof AppError;
    const statusCode = isAppError ? err.statusCode : 500;

    // pino-http logs the request once the response finishes and reports res.err
    res.err =
        err.name === 'ValidationError' && Array.isArray(err.errors)
            ? {
                  name: err.name,
                  message: err.message,
                  errors: err.errors
              }
            : err;

    const response = {
        success: false,
        message: isAppError ? err.message : INTERNAL_SERVER_ERROR_MESSAGE
    };

    if (isAppError && err.errors) {
        response.errors = err.errors;
    }

    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
};
