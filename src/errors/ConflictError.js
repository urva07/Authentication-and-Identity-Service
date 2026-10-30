const AppError = require('./AppError');

class ConflictError extends AppError {
    constructor(message = 'A conflict occurred', statusCode = 409) {
        super(message, statusCode);
        this.name = 'ConflictError';
    }
}

module.exports = ConflictError;
