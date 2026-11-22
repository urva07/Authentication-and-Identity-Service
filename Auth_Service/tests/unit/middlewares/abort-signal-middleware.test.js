const { describe, afterEach, jest: jestApi, test, expect } = require('@jest/globals');
const { EventEmitter } = require('node:events');
const {
    ExternalServiceTimeoutError
} = require('../../../src/errors');
const config = require('../../../src/config/config');
const abortSignalMiddleware = require('../../../src/middlewares/abort-signal.middleware');

describe('abort signal middleware', () => {
    const originalTimeoutMs = config.apps.mainApp.externalApiTimeoutMs;

    afterEach(() => {
        jestApi.useRealTimers();
        config.apps.mainApp.externalApiTimeoutMs = originalTimeoutMs;
    });

    const createRequestResponse = () => {
        const req = new EventEmitter();
        const res = new EventEmitter();
        res.writableEnded = false;
        return { req, res };
    };

    test('aborts the request signal with a 504 reason when the deadline expires', () => {
        jestApi.useFakeTimers();
        config.apps.mainApp.externalApiTimeoutMs = 25;
        const { req, res } = createRequestResponse();
        const next = jestApi.fn();

        abortSignalMiddleware(req, res, next);
        expect(req.abortSignal.aborted).toBe(false);
        expect(next).toHaveBeenCalledWith();

        jestApi.advanceTimersByTime(25);

        expect(req.abortSignal.aborted).toBe(true);
        expect(req.abortSignal.reason).toBeInstanceOf(
            ExternalServiceTimeoutError
        );
        expect(req.abortSignal.reason.statusCode).toBe(504);
    });

    test('aborts the request signal when the client disconnects', () => {
        jestApi.useFakeTimers();
        config.apps.mainApp.externalApiTimeoutMs = 1000;
        const { req, res } = createRequestResponse();
        const next = jestApi.fn();

        abortSignalMiddleware(req, res, next);
        req.emit('aborted');

        expect(req.abortSignal.aborted).toBe(true);
        expect(req.abortSignal.reason.message).toBe('Client disconnected');
        expect(jestApi.getTimerCount()).toBe(0);
    });

    test('clears its deadline after the response finishes', () => {
        jestApi.useFakeTimers();
        config.apps.mainApp.externalApiTimeoutMs = 1000;
        const { req, res } = createRequestResponse();

        abortSignalMiddleware(req, res, jestApi.fn());
        res.writableEnded = true;
        res.emit('finish');
        jestApi.advanceTimersByTime(1000);

        expect(req.abortSignal.aborted).toBe(false);
        expect(jestApi.getTimerCount()).toBe(0);
    });
});
