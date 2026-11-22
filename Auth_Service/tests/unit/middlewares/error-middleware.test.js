const { describe, afterEach, jest: jestApi, test, expect } = require('@jest/globals');
const { z } = require('zod');
const { AppError, ValidationError } = require('../../../src/errors');
const errorMiddleware = require('../../../src/middlewares/error.middleware');

describe('error middleware', () => {
    afterEach(() => {
        jestApi.restoreAllMocks();
    });

    test('delegates to the next error handler after headers are sent', () => {
        const error = new Error('response already started');
        const next = jestApi.fn();
        const res = {
            headersSent: true,
            status: jestApi.fn().mockReturnThis(),
            json: jestApi.fn()
        };

        errorMiddleware(
            error,
            { method: 'GET', originalUrl: '/api/users' },
            res,
            next
        );

        expect(next).toHaveBeenCalledWith(error);
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
        expect(res.err).toBeUndefined();
    });

    test('does not log raw validation input or its cause', () => {
        const secretPassword = 'user-entered-password';
        const parsed = z
            .object({
                password: z.number()
            })
            .safeParse({ password: secretPassword });
        const error = new ValidationError(parsed.error);
        const res = {
            status: jestApi.fn().mockReturnThis(),
            json: jestApi.fn()
        };

        errorMiddleware(error, { method: 'POST', originalUrl: '/api/login' }, res);

        expect(res.err).not.toHaveProperty('cause');
        expect(JSON.stringify(res.err)).not.toContain(secretPassword);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                errors: expect.any(Array)
            })
        );
    });

    test('exposes unexpected errors to pino-http', () => {
        const error = new Error('database unavailable');
        const res = {
            status: jestApi.fn().mockReturnThis(),
            json: jestApi.fn()
        };

        errorMiddleware(error, { method: 'GET', originalUrl: '/api/users' }, res);

        expect(res.err).toBe(error);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Internal Server Error'
        });
    });

    test('uses the status code and message defined by an AppError', () => {
        const res = {
            status: jestApi.fn().mockReturnThis(),
            json: jestApi.fn()
        };

        errorMiddleware(
            new AppError('Authentication is not configured', 503),
            { method: 'GET', originalUrl: '/api/users' },
            res
        );

        expect(res.status).toHaveBeenCalledWith(503);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Authentication is not configured'
        });
    });

    test('exposes operational errors to pino-http', () => {
        const error = new AppError('Invalid login credentials', 401);
        const res = {
            status: jestApi.fn().mockReturnThis(),
            json: jestApi.fn()
        };

        errorMiddleware(error, { method: 'POST', originalUrl: '/api/login' }, res);

        expect(res.err).toBe(error);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('ignores the status code and message of an unknown error', () => {
        const error = Object.assign(new Error('unexpected'), {
            statusCode: 400
        });
        const res = {
            status: jestApi.fn().mockReturnThis(),
            json: jestApi.fn()
        };

        errorMiddleware(error, { method: 'POST', originalUrl: '/api/login' }, res);

        expect(res.err).toBe(error);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Internal Server Error'
        });
    });
});
