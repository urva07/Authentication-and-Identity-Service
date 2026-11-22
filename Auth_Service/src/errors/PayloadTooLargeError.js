const AppError = require('./AppError');

class PayloadTooLargeError extends AppError {
    constructor(message='Payload Too Large', statusCode = 413) {
        super(message, statusCode);
        this.name = 'PayloadTooLargeError';
    }
}

module.exports = PayloadTooLargeError;