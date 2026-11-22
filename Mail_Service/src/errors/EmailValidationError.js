const AppError = require('./AppError');

class EmailValidationError extends AppError {
    constructor(message = 'Invalid email request', statusCode = 400) {
        super(message, statusCode);
        this.name = 'EmailValidationError';
    }
}

module.exports = EmailValidationError;
