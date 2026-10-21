const loginValidator = require('../../../src/validators/login.validator');
const { loginSchema } = loginValidator;

describe('login POST validator', () => {
    test('validates login POST bodies and replaces them with parsed input', () => {
        const req = {
            body: {
                contactType: 'email',
                email: 'ada@example.com',
                password: 'secret'
            }
        };
        const next = jest.fn();

        loginValidator.post(req, {}, next);

        expect(next).toHaveBeenCalledWith();
        expect(req.body).toEqual({
            contactType: 'email',
            email: 'ada@example.com',
            password: 'secret'
        });
    });

    test('exports the login request schema', () => {
        expect(
            loginSchema.safeParse({
                contactType: 'phone',
                phone: '+12025550123',
                password: 'secret'
            }).success
        ).toBe(true);
    });
});
