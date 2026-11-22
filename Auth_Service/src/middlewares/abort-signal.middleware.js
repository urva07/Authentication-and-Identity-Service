const { ExternalServiceTimeoutError } = require('../errors');
const config = require('../config/config');
let logger = require('#src/utils/logger.js');

const abortSignalMiddleware = (req, res, next) => {
    logger = req.log || logger;
    const controller = new AbortController();
    req.abortSignal = controller.signal;

    const abortForClientDisconnect = () => {
        if (!controller.signal.aborted) {
            logger.debug('[abort-signal] Client disconnected; aborting request');
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

    const onResponseFinish = () => {
        logger.debug('[abort-signal] Response finished; cleaning up');
        cleanup();
    };

    const cleanup = () => {
        clearTimeout(timeout);
        req.removeListener('aborted', abortForClientDisconnect);
        res.removeListener('close', onResponseClose);
        res.removeListener('finish', cleanup);
    };

    req.once('aborted', abortForClientDisconnect);
    res.once('close', onResponseClose);
    res.once('finish', onResponseFinish);

    const timeout = setTimeout(() => {
        if (!controller.signal.aborted) {
            logger.debug('[abort-signal] External service timeout; aborting request');
            controller.abort(new ExternalServiceTimeoutError());
        }
        cleanup();
    }, config.apps.mainApp.externalApiTimeoutMs);

    timeout.unref?.();

    next();
};

module.exports = abortSignalMiddleware;
