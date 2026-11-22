const AppError = require('./AppError');

class ExternalServiceTimeoutError extends AppError {
    constructor(message='External service request timed out', statusCode=504) {
        super(message, statusCode);
        this.name = 'ExternalServiceTimeoutError';
    }
}

module.exports = ExternalServiceTimeoutError;
