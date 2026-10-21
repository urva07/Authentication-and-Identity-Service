const { z } = require('zod');
const { ValidationError } = require('../errors');

const contactSchema = z.string().trim().min(1);

const loginSchema = z.discriminatedUnion('contactType', [
    z.object({
        contactType: z.literal('email'),
        email: z.email().trim(),
        password: contactSchema
    }).strict(),
    z.object({
        contactType: z.literal('phone'),
        phone: contactSchema.max(30),
        password: contactSchema
    }).strict()
]);

const validateLogin = (req, res, next) => {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
        return next(new ValidationError(result.error));
    }

    req.body = result.data;
    return next();
};

module.exports = {
    loginSchema,
    get: (req, res, next) => next(),
    post: validateLogin,
    put: (req, res, next) => next(),
    patch: (req, res, next) => next(),
    delete: (req, res, next) => next()
};
