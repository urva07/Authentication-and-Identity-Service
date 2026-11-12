const {
    describe,
    test,
    expect,
    jest: jestApi
} = require('@jest/globals');
const { EventEmitter } = require('node:events');
const requestCounterMiddleware = require('../../../src/middlewares/requestCounter.middleware');

describe('request counter middleware', () => {
    const createRequestResponse = ({
        complete = true,
        shuttingDown = false,
        socketDestroyed = false
    } = {}) => {
        const req = new EventEmitter();
        req.app = { locals: { shuttingDown } };
        req.complete = complete;
        req.socket = {
            destroyed: socketDestroyed,
            destroy: jestApi.fn(function destroy() {
                this.destroyed = true;
            })
        };
        const res = new EventEmitter();

        return { req, res };
    };

    test('tracks an in-flight request and decrements once when it finishes', () => {
        const { req, res } = createRequestResponse();
        const next = jestApi.fn();

        requestCounterMiddleware(req, res, next);

        expect(req.app.locals.requestCount).toBe(1);
        expect(next).toHaveBeenCalledWith();

        res.emit('finish');
        res.emit('close');

        expect(req.app.locals.requestCount).toBe(0);
    });

    test('decrements a disconnected incomplete request', () => {
        const { req, res } = createRequestResponse({ complete: false });

        requestCounterMiddleware(req, res, jestApi.fn());
        req.emit('close');

        expect(req.app.locals.requestCount).toBe(0);
        expect(req.socket.destroy).not.toHaveBeenCalled();
    });

    test('destroys the response socket during shutdown', () => {
        const { req, res } = createRequestResponse({ shuttingDown: true });

        requestCounterMiddleware(req, res, jestApi.fn());
        res.emit('close');
        res.emit('finish');

        expect(req.app.locals.requestCount).toBe(0);
        expect(req.socket.destroy).toHaveBeenCalledTimes(1);
    });

    test('does not destroy a socket that is already destroyed', () => {
        const { req, res } = createRequestResponse({
            shuttingDown: true,
            socketDestroyed: true
        });

        requestCounterMiddleware(req, res, jestApi.fn());
        res.emit('finish');

        expect(req.socket.destroy).not.toHaveBeenCalled();
    });
});
