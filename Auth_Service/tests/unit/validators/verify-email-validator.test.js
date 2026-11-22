const { describe, test, jest: jestApi, expect } = require('@jest/globals');
const { ValidationError } = require('#src/errors/index.js');
const validator = require('#src/validators/verify-email.validator.js');

describe('verify email validator', () => {
    test('accepts a request with a token query parameter', () => {
        const next = jestApi.fn();

        validator.get({ query: { token: 'v1.iv.tag.ciphertext' } }, {}, next);

        expect(next).toHaveBeenCalledWith();
    });

    test.each([
        [{}],
        [{ token: '' }],
        [{ token: ['a', 'b'] }],
        [{ token: 'a'.repeat(4097) }]
    ])('rejects an invalid query %j', (query) => {
        const next = jestApi.fn();

        validator.get({ query }, {}, next);

        expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });
});
