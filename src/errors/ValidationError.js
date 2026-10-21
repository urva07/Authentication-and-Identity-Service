const AppError = require('./AppError');

class ValidationError extends AppError {
    constructor(zodError) {
        if (!zodError || !Array.isArray(zodError.issues)) {
            throw new TypeError('ValidationError requires a ZodError');
        }

        super('Validation failed', 400);

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
