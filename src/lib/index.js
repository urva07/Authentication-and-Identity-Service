module.exports = {
    requestCoalescer: require('./requestCoalescer.js'),
    openSockets: require('./openSockets.js'),
    createCoalescingKey: require('./createCoalescingKey.js'),
    retryWithExponentialBackoff: require('./retryWithExponentialBackoff.js'),
};