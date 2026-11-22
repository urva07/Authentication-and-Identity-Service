const AppError = require('./AppError');

class ExternalServiceError extends AppError {
    constructor(message='External service error', statusCode=502) {
        super(message, statusCode);
        this.name = 'ExternalServiceError';
    }
}

module.exports = ExternalServiceError;