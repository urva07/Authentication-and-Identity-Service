const logger = require('../utils/logger');

const workerConfig = {
    concurrency: process.env.MAIL_WORKER_CONCURRENCY === undefined
        ? 5
        : Number(process.env.MAIL_WORKER_CONCURRENCY),
    maxStalledCount: process.env.MAIL_WORKER_MAX_STALLED_COUNT === undefined
        ? 1
        : Number(process.env.MAIL_WORKER_MAX_STALLED_COUNT),
    stalledInterval: process.env.MAIL_WORKER_STALLED_INTERVAL_MS === undefined
        ? 30000
        : Number(process.env.MAIL_WORKER_STALLED_INTERVAL_MS),
    lockDuration: process.env.MAIL_WORKER_LOCK_DURATION_MS === undefined
        ? 30000
        : Number(process.env.MAIL_WORKER_LOCK_DURATION_MS)
};

const invalidConfigs = [];

for (const [key, value] of Object.entries(workerConfig)) {
    if (!Number.isInteger(value) || value < 1) {
        invalidConfigs.push(key);
    }
}

if (invalidConfigs.length > 0) {
    logger.fatal(
        { invalidConfigs },
        'Critical worker configuration is missing or invalid'
    );
    process.exit(1);
}

module.exports = workerConfig;
