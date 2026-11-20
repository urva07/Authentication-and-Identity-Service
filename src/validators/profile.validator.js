const { z } = require('zod');
const { ValidationError } = require('../errors');
const { VALIDATION_LIMITS, PHONE_PATTERN } = require('#src/constants/index.js');

const optionalText = (max) => z.string().trim().max(max);

const profileIdParamsSchema = z.object({
    id: z.uuid('Invalid profile id')
});

const updateProfileSchema = z.object({
    firstName: optionalText(VALIDATION_LIMITS.NAME_MAX_LENGTH).min(1, 'First name must not be empty'),
    lastName: optionalText(VALIDATION_LIMITS.NAME_MAX_LENGTH).min(1, 'Last name must not be empty'),
    phone: z.string()
        .trim()
        .regex(PHONE_PATTERN, 'Invalid phone number')
        .nullable(),
    dateOfBirth: z.iso.date('Date of birth must be in YYYY-MM-DD format').nullable(),
    gender: optionalText(VALIDATION_LIMITS.GENDER_MAX_LENGTH).min(1, 'Gender must not be empty').nullable(),
    profilePhoto: z.url({ protocol: /^https?$/ })
        .max(VALIDATION_LIMITS.PROFILE_PHOTO_MAX_LENGTH)
        .nullable()
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
