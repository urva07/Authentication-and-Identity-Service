const registry = require('./prometheus');
const { Counter, Histogram } = require('@prometheus-io/client');


const requestCount = new Counter({
    name: 'http_requests_total',
    help: 'Total number of completed HTTP requests.',
    labelNames: ['method', 'status_code', 'path', 'ip', 'user_id', 'mail'],
    registers: [registry]
});

const failedRequestCount = new Counter({
    name: 'http_failed_requests_total',
    help: 'Total number of completed HTTP requests with a 4xx or 5xx status.',
    labelNames: ['method', 'status_code', 'path', 'ip', 'user_id', 'mail'],
    registers: [registry]
});

const requestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of completed HTTP requests in seconds.',
    labelNames: ['method', 'status_code', 'path'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [registry]
});

const dbQueryDuration = new Histogram({
    name: 'db_query_duration_seconds',
    help: 'Duration of database queries in seconds.',
    labelNames: ['query_name', 'repository_name'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [registry]
});


module.exports = {
    requestCount,
    failedRequestCount,
    requestDuration,
    dbQueryDuration
};
