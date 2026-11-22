class AppError extends Error {
    constructor(message, statusCode) {
        super(message);

        this.name = 'AppError';
        this.statusCode = statusCode || 500;

        if (this.statusCode >= 400 && this.statusCode < 500) {
            this.status = 'fail';
        } else {
            this.status = 'error';
        }

        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;
