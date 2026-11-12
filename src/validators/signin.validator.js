const { z } = require('zod');
const { ValidationError } = require('../errors');


const nameSchema = z.string().trim().min(2, 'Name must be at least 2 characters long').max(100, 'Name must be at most 100 characters long');

const signinSchema = z.object({
    email: z.string().trim().toLowerCase().pipe(
        z.email("Invalid email address").max(254, 'Email must be at most 254 characters long')
    ),
    password: z.string().min(4, 'Password must be at least 4 characters long').max(15, 'Password must be at most 15 characters long'),
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
