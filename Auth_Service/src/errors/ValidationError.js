const AppError = require('./AppError');
const { ZodError } = require('zod');

class ValidationError extends AppError {
    constructor(errorMsgOrZodError, statusCode = 400) {
        if (errorMsgOrZodError instanceof ZodError) {
            super('Validation failed', statusCode);

            this.name = 'ValidationError';
            this.cause = errorMsgOrZodError;
            this.errors = errorMsgOrZodError.issues.map((issue) => ({
                field: issue.path.join('.'),
                message: issue.message
            }));
            this.details = {
                validationErrors: this.errors
            };
        } else if (typeof errorMsgOrZodError === 'string') {
            super(errorMsgOrZodError, statusCode);
            this.name = 'ValidationError';
        } else {
            throw new TypeError('ValidationError requires a string or ZodError');
        }
    }
}

module.exports = ValidationError;
