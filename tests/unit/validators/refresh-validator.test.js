const refreshValidator = require('../../../src/validators/refresh.validator');
const { ValidationError } = require('../../../src/errors');

describe('refresh POST validator', () => {
    test.each([undefined, {}])('accepts an empty body: %j', (body) => {
        const req = { body };
        const next = jest.fn();

        refreshValidator.post(req, {}, next);

        expect(req.body).toEqual({});
        expect(next).toHaveBeenCalledWith();
    });

    test('strips unused fields from the request body', () => {
        const req = { body: { refreshToken: 'token-in-body', extra: true } };
        const next = jest.fn();

        refreshValidator.post(req, {}, next);

        expect(req.body).toEqual({});
        expect(next).toHaveBeenCalledWith();
    });

    test('forwards a validation error for a non-object body', () => {
        const next = jest.fn();

        refreshValidator.post({ body: 'invalid' }, {}, next);

        expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });
});
