const { z } = require('zod');
const { ValidationError } = require('../errors');

const changePasswordSchema = z.object({
    token: z.string().min(1).max(4096),
    newPassword: z.string()
        .min(4, 'Password must be at least 4 characters long')
        .max(15, 'Password must be at most 15 characters long')
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
