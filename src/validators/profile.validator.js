const { z } = require('zod');
const { ValidationError } = require('../errors');

const optionalText = (max) => z.string().trim().max(max);

const profileIdParamsSchema = z.object({
    id: z.uuid('Invalid profile id')
});

const updateProfileSchema = z.object({
    firstName: optionalText(100).min(1, 'First name must not be empty'),
    lastName: optionalText(100).min(1, 'Last name must not be empty'),
    phone: z.string().trim().regex(/^\+?[0-9]{6,29}$/, 'Invalid phone number').nullable(),
    dateOfBirth: z.iso.date('Date of birth must be in YYYY-MM-DD format').nullable(),
    gender: optionalText(30).min(1, 'Gender must not be empty').nullable(),
    profilePhoto: z.url({ protocol: /^https?$/ }).max(500).nullable()
}).partial().strict().refine(
    (body) => Object.keys(body).length > 0,
    { message: 'At least one field must be provided' }
);

const validateId = (req, res, next) => {
    const result = profileIdParamsSchema.safeParse(req.params);

    if (!result.success) {
        return next(new ValidationError(result.error));
    }

    req.params.id = result.data.id;
    return next();
};

const validateUpdateProfile = (req, res, next) => {
    const result = updateProfileSchema.safeParse(req.body ?? {});

    if (!result.success) {
        return next(new ValidationError(result.error));
    }

    req.body = result.data;
    return next();
};

const passThrough = (req, res, next) => next();

module.exports = {
    profileIdParamsSchema,
    updateProfileSchema,
    get: validateId,
    post: passThrough,
    put: passThrough,
    patch: validateUpdateProfile,
    delete: passThrough
};
