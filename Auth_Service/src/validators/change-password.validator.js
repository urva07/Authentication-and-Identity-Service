const { z } = require('zod');
const { ValidationError } = require('../errors');
const { VALIDATION_LIMITS } = require('#src/constants/index.js');

const changePasswordSchema = z.object({
    token: z.string().min(1).max(VALIDATION_LIMITS.TOKEN_MAX_LENGTH),
    newPassword: z.string()
        .min(VALIDATION_LIMITS.PASSWORD_MIN_LENGTH, 'Password must be at least 4 characters long')
        .max(VALIDATION_LIMITS.PASSWORD_MAX_LENGTH, 'Password must be at most 15 characters long')
}).strict();

const validateChangePassword = (req, res, next) => {
    const result = changePasswordSchema.safeParse(req.body);

    if (!result.success) {
        return next(new ValidationError(result.error));
    }

    req.body = result.data;
    return next();
};

const passThrough = (req, res, next) => next();

module.exports = {
    changePasswordSchema,
    get: passThrough,
    post: validateChangePassword,
    put: passThrough,
    patch: passThrough,
    delete: passThrough
};
