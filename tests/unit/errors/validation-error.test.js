const { describe, test, expect } = require('@jest/globals');
const { z } = require('zod');
const { ValidationError } = require('../../../src/errors');

describe('ValidationError', () => {
    test('converts Zod issues into a 400 application error', () => {
        const result = z.object({ email: z.email() }).safeParse({
            email: 'invalid'
        });
        const error = new ValidationError(result.error);

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('ValidationError');
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('Validation failed');
        expect(error.errors).toEqual([
            expect.objectContaining({
                field: 'email',
                message: expect.any(String)
            })
        ]);
    });

    test('rejects inputs that are not Zod errors', () => {
        expect(() => new ValidationError(new Error('invalid'))).toThrow(
            'ValidationError requires a string or ZodError'
        );
    });
});
