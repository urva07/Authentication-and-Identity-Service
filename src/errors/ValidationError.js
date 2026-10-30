const AppError = require('./AppError');

class ValidationError extends AppError {
    constructor(zodError, statusCode = 400) {
        if (!zodError || !Array.isArray(zodError.issues)) {
            throw new TypeError('ValidationError requires a ZodError');
        }

        super('Validation failed', statusCode);

        this.name = 'ValidationError';
        this.cause = zodError;
        this.errors = zodError.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message
        }));
        this.details = {
            validationErrors: this.errors
        };
    }
}

module.exports = ValidationError;
