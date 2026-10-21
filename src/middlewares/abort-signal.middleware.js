const { ExternalServiceTimeoutError } = require('../errors');
const config = require('../config/config');

const abortSignalMiddleware = (req, res, next) => {
    const controller = new AbortController();
    req.abortSignal = controller.signal;

    const abortForClientDisconnect = () => {
        if (!controller.signal.aborted) {
            controller.abort(new Error('Client disconnected'));
        }
        cleanup();
    };

    const onResponseClose = () => {
        if (!res.writableEnded) {
            abortForClientDisconnect();
        } else {
            cleanup();
        }
    };

    const cleanup = () => {
        clearTimeout(timeout);
        req.removeListener('aborted', abortForClientDisconnect);
        res.removeListener('close', onResponseClose);
        res.removeListener('finish', cleanup);
    };

    req.once('aborted', abortForClientDisconnect);
    res.once('close', onResponseClose);
    res.once('finish', cleanup);

    const timeout = setTimeout(() => {
        if (!controller.signal.aborted) {
            controller.abort(new ExternalServiceTimeoutError());
        }
        cleanup();
    }, config.app.externalApiTimeoutMs);

    timeout.unref?.();

    next();
};

module.exports = abortSignalMiddleware;
