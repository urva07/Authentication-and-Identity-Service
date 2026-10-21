const { z } = require('zod');
const { ValidationError } = require('../errors');

const csrfSchema = z.object({});

const validateCsrf = (req, res, next) => {
    const result = csrfSchema.safeParse(req.body ?? {});

    if (!result.success) {
        return next(new ValidationError(result.error));
    }

    req.body = result.data;
    return next();
};

const passThrough = (req, res, next) => next();

module.exports = {
    csrfSchema,
    get: validateCsrf,
    post: passThrough,
    put: passThrough,
    patch: passThrough,
    delete: passThrough
};
