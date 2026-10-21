const AppError = require('./AppError');

class ExternalServiceTimeoutError extends AppError {
    constructor(cause) {
        super('External service request timed out', 504);
        this.name = 'ExternalServiceTimeoutError';
        this.cause = cause;
    }
}

module.exports = ExternalServiceTimeoutError;
