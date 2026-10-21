const { z } = require('zod');
const logger = require('../../../src/utils/logger');
const { AppError, ValidationError } = require('../../../src/errors');
const errorMiddleware = require('../../../src/middlewares/error.middleware');

describe('error middleware', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('does not log raw validation input or its cause', () => {
        const secretPassword = 'user-entered-password';
        const parsed = z
            .object({
                password: z.number()
            })
            .safeParse({ password: secretPassword });
        const error = new ValidationError(parsed.error);
        const loggerSpy = jest.spyOn(logger, 'warn').mockImplementation();
        const errorSpy = jest.spyOn(logger, 'error').mockImplementation();
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        errorMiddleware(error, { method: 'POST', originalUrl: '/api/login' }, res);

        const loggedError = loggerSpy.mock.calls[0][0].err;
        expect(loggedError).not.toHaveProperty('cause');
        expect(JSON.stringify(loggedError)).not.toContain(secretPassword);
        expect(errorSpy).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                errors: expect.any(Array)
            })
        );
    });

    test('logs unexpected errors at error level', () => {
        const error = new Error('database unavailable');
        const warnSpy = jest.spyOn(logger, 'warn').mockImplementation();
        const errorSpy = jest.spyOn(logger, 'error').mockImplementation();
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        errorMiddleware(error, { method: 'GET', originalUrl: '/api/users' }, res);

        expect(warnSpy).not.toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 500 }),
            'Request failed'
        );
        expect(res.status).toHaveBeenCalledWith(500);
    });

    test('logs operational authentication errors at warning level', () => {
        const error = new AppError('Invalid login credentials', 401);
        const warnSpy = jest.spyOn(logger, 'warn').mockImplementation();
        const errorSpy = jest.spyOn(logger, 'error').mockImplementation();
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        errorMiddleware(error, { method: 'POST', originalUrl: '/api/login' }, res);

        expect(warnSpy).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 401 }),
            'Request failed'
        );
        expect(errorSpy).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('does not treat an arbitrary error status as operational', () => {
        const error = Object.assign(new Error('unexpected'), {
            statusCode: 400
        });
        const warnSpy = jest.spyOn(logger, 'warn').mockImplementation();
        const errorSpy = jest.spyOn(logger, 'error').mockImplementation();
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        errorMiddleware(error, { method: 'POST', originalUrl: '/api/login' }, res);

        expect(warnSpy).not.toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
            'Request failed'
        );
    });
});
