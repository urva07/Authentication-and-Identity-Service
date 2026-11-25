const logger = require('../utils/logger');
const { MAIL_QUEUE_NAMES } = require('../constants');


const parseRetention = (value, fallback) => {
    if (value === undefined) return fallback;
    if (value === 'false') return false;
    return Number(value);
};

const queueConfig = {
    mailQueueName: process.env.MAIL_QUEUE_NAME || MAIL_QUEUE_NAMES.MAIL,
    defaultJobOptions: {
        attempts: process.env.MAIL_JOB_ATTEMPTS === undefined
            ? 3
            : Number(process.env.MAIL_JOB_ATTEMPTS),
        backoff: {
            type: process.env.MAIL_JOB_BACKOFF_TYPE || 'exponential',
            delay: process.env.MAIL_JOB_BACKOFF_DELAY_MS === undefined
                ? 1000
                : Number(process.env.MAIL_JOB_BACKOFF_DELAY_MS)
        },
        removeOnComplete: parseRetention(
            process.env.MAIL_REMOVE_ON_COMPLETE,
            100
        ),
        removeOnFail: parseRetention(
            process.env.MAIL_REMOVE_ON_FAIL,
            1000
        )
    }
};

const invalidConfigs = [];
const jobOptions = queueConfig.defaultJobOptions;

if (!queueConfig.mailQueueName.trim()) {
    invalidConfigs.push('MAIL_QUEUE_NAME');
}
if (!Number.isInteger(jobOptions.attempts) || jobOptions.attempts < 1) {
    invalidConfigs.push('MAIL_JOB_ATTEMPTS');
}
if (!['fixed', 'exponential'].includes(jobOptions.backoff.type)) {
    invalidConfigs.push('MAIL_JOB_BACKOFF_TYPE');
}
if (!Number.isInteger(jobOptions.backoff.delay) || jobOptions.backoff.delay < 1) {
    invalidConfigs.push('MAIL_JOB_BACKOFF_DELAY_MS');
}
if (
    jobOptions.removeOnComplete !== false &&
    (!Number.isInteger(jobOptions.removeOnComplete) ||
        jobOptions.removeOnComplete < 0)
) {
    invalidConfigs.push('MAIL_REMOVE_ON_COMPLETE');
}
if (
    jobOptions.removeOnFail !== false &&
    (!Number.isInteger(jobOptions.removeOnFail) ||
        jobOptions.removeOnFail < 0)
) {
    invalidConfigs.push('MAIL_REMOVE_ON_FAIL');
}

if (invalidConfigs.length > 0) {
    logger.fatal(
        { invalidConfigs },
        'Critical queue configuration is missing or invalid'
    );
    process.exit(1);
}


module.exports = queueConfig;