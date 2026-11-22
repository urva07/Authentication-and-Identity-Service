const defaultLogger = require('#src/utils/logger.js');


const pendingRequests = new Map();

const requestCoalescer = async (key, requestFn, logger=defaultLogger) => {
    if (pendingRequests.has(key)) {
        logger.debug('[Request Coalescer] Coalescing request with an existing pending request');
        return pendingRequests.get(key);
    }

    const requestPromise = requestFn().finally(() => {
        pendingRequests.delete(key);
        logger.debug('[Request Coalescer] Request settled; removed it from pending requests');
    });

    pendingRequests.set(key, requestPromise);
    return requestPromise;
};


module.exports = requestCoalescer;