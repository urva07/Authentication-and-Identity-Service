const { describe, test, jest: jestApi, expect } = require('@jest/globals');
const signinValidator = require('../../../src/validators/signin.validator');
const { ValidationError } = require('../../../src/errors');

describe('signin POST validator', () => {
    test.each([
        {
            email: 'ada@example.com',
            password: 'secret',
            name: 'Ada Lovelace'
        }
    ])('accepts valid credentials: %j', (body) => {
        const req = { body };
        const next = jestApi.fn();

        signinValidator.post(req, {}, next);

        expect(req.body).toEqual(body);
        expect(next).toHaveBeenCalledWith();
    });

    test.each([
        {},
        {
            contactType: 'email',
            email: 'not-an-email',
            password: 'secret',
            name: 'Ada'
        },
        {
            contactType: 'phone',
            phone: '+12025550123',
            password: 'secret',
            name: 'Ada'
        },
        {
            contactType: 'email',
            email: 'ada@example.com',
            password: '',
            name: 'Ada'
        },
        {
            contactType: 'email',
            email: 'ada@example.com',
            password: 'secret',
            name: ' '
        },
        {
            contactType: 'email',
            email: 'ada@example.com',
            phone: '+12025550123',
            password: 'secret',
            name: 'Ada'
        }
    ])('rejects invalid sign-in credentials: %j', (body) => {
        const next = jestApi.fn();

        signinValidator.post({ body }, {}, next);

        expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });
});
