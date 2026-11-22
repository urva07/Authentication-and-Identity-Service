const { z } = require('zod');
const { ValidationError } = require('../errors');
const { VALIDATION_LIMITS } = require('#src/constants/index.js');

const verifyEmailQuerySchema = z.object({
    token: z.string().min(1).max(VALIDATION_LIMITS.TOKEN_MAX_LENGTH)
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
