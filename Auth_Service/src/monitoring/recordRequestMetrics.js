const requestMetricsRecorderCreator = ({ requestCount, failedRequestCount, requestDuration }) => {
    const recordRequestMetrics = (req, res, responseTimeMs) => {
        const statusCode = String(res.statusCode);
        const labels = {
            method: req.method,
            status_code: statusCode,
            path: req.path
        };

        const userIdentityLabels = {
            ip: req.ip,
            user_id: req.user?.id || '',
            mail: req.user?.mail || ''
        };

        requestCount.inc({...labels, ...userIdentityLabels});
        requestDuration.observe(labels, responseTimeMs / 1000);

        if (res.statusCode >= 400) {
            failedRequestCount.inc({...labels, ...userIdentityLabels});
        }
    };

    return recordRequestMetrics;
}


module.exports = requestMetricsRecorderCreator;