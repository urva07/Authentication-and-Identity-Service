const requestMetricsRecorderCreator = ({ requestCount, failedRequestCount, requestDuration }) => {
    const recordRequestMetrics = (req, res, responseTimeMs) => {
        const statusCode = String(res.statusCode);
        const labels = {
            method: req.method,
            status_code: statusCode,
            path: req.path
        };

        requestCount.inc(labels);
        requestDuration.observe(labels, responseTimeMs / 1000);

        if (res.statusCode >= 400) {
            failedRequestCount.inc(labels);
        }
    };

    return recordRequestMetrics;
}


module.exports = requestMetricsRecorderCreator;