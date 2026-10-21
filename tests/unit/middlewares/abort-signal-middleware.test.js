const { EventEmitter } = require('node:events');
const {
    ExternalServiceTimeoutError
} = require('../../../src/errors');
const config = require('../../../src/config/config');
const abortSignalMiddleware = require('../../../src/middlewares/abort-signal.middleware');

describe('abort signal middleware', () => {
    const originalTimeoutMs = config.app.externalApiTimeoutMs;

    afterEach(() => {
        jest.useRealTimers();
        config.app.externalApiTimeoutMs = originalTimeoutMs;
    });

    const createRequestResponse = () => {
        const req = new EventEmitter();
        const res = new EventEmitter();
        res.writableEnded = false;
        return { req, res };
    };

    test('aborts the request signal with a 504 reason when the deadline expires', () => {
        jest.useFakeTimers();
        config.app.externalApiTimeoutMs = 25;
        const { req, res } = createRequestResponse();
        const next = jest.fn();

        abortSignalMiddleware(req, res, next);
        expect(req.abortSignal.aborted).toBe(false);
        expect(next).toHaveBeenCalledWith();

        jest.advanceTimersByTime(25);

        expect(req.abortSignal.aborted).toBe(true);
        expect(req.abortSignal.reason).toBeInstanceOf(
            ExternalServiceTimeoutError
        );
        expect(req.abortSignal.reason.statusCode).toBe(504);
    });

    test('aborts the request signal when the client disconnects', () => {
        jest.useFakeTimers();
        config.app.externalApiTimeoutMs = 1000;
        const { req, res } = createRequestResponse();
        const next = jest.fn();

        abortSignalMiddleware(req, res, next);
        req.emit('aborted');

        expect(req.abortSignal.aborted).toBe(true);
        expect(req.abortSignal.reason.message).toBe('Client disconnected');
        expect(jest.getTimerCount()).toBe(0);
    });

    test('clears its deadline after the response finishes', () => {
        jest.useFakeTimers();
        config.app.externalApiTimeoutMs = 1000;
        const { req, res } = createRequestResponse();

        abortSignalMiddleware(req, res, jest.fn());
        res.writableEnded = true;
        res.emit('finish');
        jest.advanceTimersByTime(1000);

        expect(req.abortSignal.aborted).toBe(false);
        expect(jest.getTimerCount()).toBe(0);
    });
});
