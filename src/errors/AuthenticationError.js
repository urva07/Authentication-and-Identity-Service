const AppError = require('./AppError');

class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed', statusCode = 401) {
        super(message, statusCode);
        this.name = 'AuthenticationError';
    }
}

module.exports = AuthenticationError;
