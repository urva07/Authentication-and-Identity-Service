const { z } = require('zod');
const { ValidationError } = require('../errors');

const verifyEmailQuerySchema = z.object({
    token: z.string().min(1).max(4096)
});

const validateVerifyEmail = (req, res, next) => {
    const result = verifyEmailQuerySchema.safeParse(req.query);

    if (!result.success) {
        return next(new ValidationError(result.error));
    }

    return next();
};

const passThrough = (req, res, next) => next();

module.exports = {
    verifyEmailQuerySchema,
    get: validateVerifyEmail,
    post: passThrough,
    put: passThrough,
    patch: passThrough,
    delete: passThrough
};
