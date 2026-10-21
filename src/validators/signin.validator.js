const { z } = require('zod');
const { ValidationError } = require('../errors');

const nameSchema = z.string().trim().min(1).max(200);

const signinSchema = z.object({
    contactType: z.literal('email'),
    email: z.email().trim(),
    password: z.string().min(1),
    name: nameSchema
}).strict();

const validateSignin = (req, res, next) => {
    const result = signinSchema.safeParse(req.body);

    if (!result.success) {
        return next(new ValidationError(result.error));
    }

    req.body = result.data;
    return next();
};

const passThrough = (req, res, next) => next();

module.exports = {
    signinSchema,
    get: passThrough,
    post: validateSignin,
    put: passThrough,
    patch: passThrough,
    delete: passThrough
};
