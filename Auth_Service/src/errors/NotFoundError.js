const AppError = require('./AppError');

class NotFoundError extends AppError {
    constructor(message = 'Resource not found', statusCode = 404) {
        super(message, statusCode);
        this.name = 'NotFoundError';
    }
}

module.exports = NotFoundError;
