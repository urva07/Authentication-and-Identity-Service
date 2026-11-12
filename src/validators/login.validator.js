const { z } = require('zod');
const { ValidationError } = require('#src/errors/index.js');


const passwordSchema = z.string().min(4, 'Password must be at least 4 characters long').max(15, 'Password must be at most 15 characters long');

const loginSchema = z.object({
    email: z.string().trim().toLowerCase().pipe(
        z.email("Invalid email address").max(254, 'Email must be at most 254 characters long')
    ),
    password: passwordSchema
}).strict();

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
