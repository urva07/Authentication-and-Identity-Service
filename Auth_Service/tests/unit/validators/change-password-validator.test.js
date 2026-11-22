const {
    describe,
    test,
    jest: jestApi,
    expect
} = require('@jest/globals');
const changePasswordValidator = require('../../../src/validators/change-password.validator');
const { ValidationError } = require('../../../src/errors');

describe('change password POST validator', () => {
    test('accepts a reset token and new password', () => {
        const req = {
            body: { token: 'signed-reset-token', newPassword: 'new-password' }
        };
        const next = jestApi.fn();

        changePasswordValidator.post(req, {}, next);

        expect(req.body).toEqual({
            token: 'signed-reset-token',
            newPassword: 'new-password'
        });
        expect(next).toHaveBeenCalledWith();
    });

    test.each([
        {},
        { token: '', newPassword: 'new-password' },
        { token: 'signed-reset-token', newPassword: 'abc' },
        { token: 'signed-reset-token', newPassword: 'this-password-is-too-long' },
        { token: 'signed-reset-token', newPassword: 'new-password', email: 'ada@example.com' }
    ])('rejects invalid input: %j', (body) => {
        const next = jestApi.fn();

        changePasswordValidator.post({ body }, {}, next);

        expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });
});
