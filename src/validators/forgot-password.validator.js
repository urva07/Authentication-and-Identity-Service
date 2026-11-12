const { z } = require('zod');
const { ValidationError } = require('../errors');

const forgotPasswordSchema = z.object({
    email: z.email().trim()
}).strict();

const validateForgotPassword = (req, res, next) => {
    const result = forgotPasswordSchema.safeParse(req.body);

    if (!result.success) {
        return next(new ValidationError(result.error));
    }

    req.body = result.data;
    return next();
};

const passThrough = (req, res, next) => next();

module.exports = {
    forgotPasswordSchema,
    get: passThrough,
    post: validateForgotPassword,
    put: passThrough,
    patch: passThrough,
    delete: passThrough
};
