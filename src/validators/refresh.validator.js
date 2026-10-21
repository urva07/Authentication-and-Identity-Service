const { z } = require('zod');
const { ValidationError } = require('../errors');

const refreshSchema = z.object({});

const validateRefresh = (req, res, next) => {
    const result = refreshSchema.safeParse(req.body ?? {});

    if (!result.success) {
        return next(new ValidationError(result.error));
    }

    req.body = result.data;
    return next();
};

const passThrough = (req, res, next) => next();

module.exports = {
    refreshSchema,
    get: passThrough,
    post: validateRefresh,
    put: passThrough,
    patch: passThrough,
    delete: passThrough
};
