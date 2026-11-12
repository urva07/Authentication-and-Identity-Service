const { requestCount, failedRequestCount, requestDuration, dbQueryDuration } = require('./metrics');
const createSequelizeLogger  = require('./sequelizeLogger');
const requestMetricsRecorderCreator = require('./recordRequestMetrics');


module.exports = {
    recordRequestMetrics: requestMetricsRecorderCreator({ requestCount, failedRequestCount, requestDuration }),
    createQueryLogger: createSequelizeLogger(dbQueryDuration)
}