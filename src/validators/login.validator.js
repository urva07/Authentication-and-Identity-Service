const { z } = require('zod');
const { ValidationError } = require('../errors');

const passwordSchema = z.string().trim().min(4, 'Password must be at least 4 characters long');

const loginSchema = z.discriminatedUnion('contactType', [
    z.object({
        contactType: z.literal('email'),
        email: z.email('Invalid email address'),
        password: passwordSchema
    }).strict(),
    z.object({
        contactType: z.literal('phone'),
        phone: z.string().trim().min(10, 'Phone number must be at least 10 characters long').max(15, 'Phone number must be at most 15 characters long'),
        password: passwordSchema
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
