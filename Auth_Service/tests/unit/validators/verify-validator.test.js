const { describe, test, jest: jestApi, expect } = require('@jest/globals');
const verifyValidator = require('../../../src/validators/verify.validator');

describe('verify POST validator', () => {
    test.each([undefined, {}])('accepts an empty body: %j', (body) => {
        const req = { body };
        const next = jestApi.fn();

        verifyValidator.post(req, {}, next);

        expect(req.body).toEqual({});
        expect(next).toHaveBeenCalledWith();
    });

    test('strips fields from the unused request body', () => {
        const req = { body: { userId: 'untrusted', other: true } };
        const next = jestApi.fn();

        verifyValidator.post(req, {}, next);

        expect(req.body).toEqual({});
        expect(next).toHaveBeenCalledWith();
    });
});
