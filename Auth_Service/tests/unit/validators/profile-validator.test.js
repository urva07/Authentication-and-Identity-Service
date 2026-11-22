const { describe, test, jest: jestApi, expect } = require('@jest/globals');
const validator = require('../../../src/validators/profile.validator');
const { ValidationError } = require('../../../src/errors');

const run = (handler, req) => {
    const next = jestApi.fn();
    handler(req, {}, next);
    return { req, next, error: next.mock.calls[0][0] };
};

describe('profile validator', () => {
    test('getById accepts a uuid', () => {
        const id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
        const { error } = run(validator.get, { params: { id } });
        expect(error).toBeUndefined();
    });

    test('getById rejects a non-uuid', () => {
        const { error } = run(validator.get, { params: { id: 'abc' } });
        expect(error).toBeInstanceOf(ValidationError);
    });

    test('patch normalizes and accepts valid fields', () => {
        const { req, error } = run(validator.patch, {
            body: { firstName: '  Ada ', dateOfBirth: '1815-12-10', phone: null }
        });
        expect(error).toBeUndefined();
        expect(req.body).toEqual({ firstName: 'Ada', dateOfBirth: '1815-12-10', phone: null });
    });

    test.each([
        [{}],
        [{ email: 'x@example.com' }],
        [{ profileCompleted: true }],
        [{ dateOfBirth: 'yesterday' }],
        [{ profilePhoto: 'javascript:alert(1)' }],
        [{ firstName: '' }]
    ])('patch rejects %j', (body) => {
        const { error } = run(validator.patch, { body });
        expect(error).toBeInstanceOf(ValidationError);
    });
});
