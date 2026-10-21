const {
    Counter,
    Histogram,
    Registry,
    collectDefaultMetrics
} = require('prom-client');

const registry = new Registry();

collectDefaultMetrics({ register: registry });

const requestCount = new Counter({
    name: 'http_requests_total',
    help: 'Total number of completed HTTP requests.',
    labelNames: ['method', 'status_code'],
    registers: [registry]
});

const failedRequestCount = new Counter({
    name: 'http_failed_requests_total',
    help: 'Total number of completed HTTP requests with a 4xx or 5xx status.',
    labelNames: ['method', 'status_code'],
    registers: [registry]
});

const requestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of completed HTTP requests in seconds.',
    labelNames: ['method', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [registry]
});

const recordRequestMetrics = (req, res, responseTimeMs) => {
    const statusCode = String(res.statusCode);
    const labels = {
        method: req.method,
        status_code: statusCode
    };

    requestCount.inc(labels);
    requestDuration.observe(labels, responseTimeMs / 1000);

    if (res.statusCode >= 400) {
        failedRequestCount.inc(labels);
    }
};

module.exports = {
    registry,
    requestCount,
    failedRequestCount,
    requestDuration,
    recordRequestMetrics
};
