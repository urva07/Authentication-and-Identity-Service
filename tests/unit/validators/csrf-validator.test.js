const { describe, test, expect, jest: jestApi } = require('@jest/globals');
const csrfValidator = require('../../../src/validators/csrf.validator');

describe('CSRF validator', () => {
    test('exposes validators for the common HTTP methods', () => {
        expect(csrfValidator).toMatchObject({
            get: expect.any(Function),
            post: expect.any(Function),
            put: expect.any(Function),
            patch: expect.any(Function),
            delete: expect.any(Function)
        });
    });

    test.each([undefined, {}])('accepts an empty GET body: %j', (body) => {
        const req = { body };
        const next = jestApi.fn();

        csrfValidator.get(req, {}, next);

        expect(req.body).toEqual({});
        expect(next).toHaveBeenCalledWith();
    });

    test('strips fields from a non-empty GET body', () => {
        const req = { body: { token: 'unexpected' } };
        const next = jestApi.fn();

        csrfValidator.get(req, {}, next);

        expect(req.body).toEqual({});
        expect(next).toHaveBeenCalledWith();
    });
});
