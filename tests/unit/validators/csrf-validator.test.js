const csrfValidator = require('../../../src/validators/csrf.validator');

describe('CSRF validator', () => {
    test('exposes validators for the common HTTP methods', () => {
        for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
            expect(typeof csrfValidator[method]).toBe('function');
        }
    });

    test.each([undefined, {}])('accepts an empty GET body: %j', (body) => {
        const req = { body };
        const next = jest.fn();

        csrfValidator.get(req, {}, next);

        expect(req.body).toEqual({});
        expect(next).toHaveBeenCalledWith();
    });

    test('strips fields from a non-empty GET body', () => {
        const req = { body: { token: 'unexpected' } };
        const next = jest.fn();

        csrfValidator.get(req, {}, next);

        expect(req.body).toEqual({});
        expect(next).toHaveBeenCalledWith();
    });
});
