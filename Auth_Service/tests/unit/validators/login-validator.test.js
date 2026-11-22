const { describe, test, jest: jestApi, expect } = require('@jest/globals');
const loginValidator = require('../../../src/validators/login.validator');
const { loginSchema } = loginValidator;

describe('login POST validator', () => {
    test('validates login POST bodies and replaces them with parsed input', () => {
        const req = {
            body: {
                email: 'ada@example.com',
                password: 'secret'
            }
        };
        const next = jestApi.fn();

        loginValidator.post(req, {}, next);

        expect(next).toHaveBeenCalledWith();
        expect(req.body).toEqual({
            email: 'ada@example.com',
            password: 'secret'
        });
    });

    test('exports the login request schema', () => {
        expect(
            loginSchema.safeParse({
                email: 'ada@example.com',
                password: 'secret'
            }).success
        ).toBe(true);
    });

    test('rejects phone as a login identifier', () => {
        expect(loginSchema.safeParse({
            phone: '+12025550123',
            password: 'secret'
        }).success).toBe(false);
    });

    test('passes a validation error to the next middleware', () => {
        const req = { body: { email: 'invalid', password: 'x' } };
        const next = jestApi.fn();

        loginValidator.post(req, {}, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({
            name: 'ValidationError'
        }));
        expect(req.body).toEqual({ email: 'invalid', password: 'x' });
    });
});
