const { z } = require('zod');
const { ValidationError } = require('../errors');

const verifySchema = z.object({});

const validateVerify = (req, res, next) => {
    const result = verifySchema.safeParse(req.body ?? {});

    if (!result.success) {
        return next(new ValidationError(result.error));
    }

    req.body = result.data;
    return next();
};

const passThrough = (req, res, next) => next();

module.exports = {
    verifySchema,
    get: passThrough,
    post: validateVerify,
    put: passThrough,
    patch: passThrough,
    delete: passThrough
};
