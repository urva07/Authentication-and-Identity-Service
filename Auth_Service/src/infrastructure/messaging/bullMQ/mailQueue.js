const { Queue } = require('bullmq');
const logger = require('#src/utils/logger.js');
const { 
    dbs: { 
        redis: {
            redisBullMQClient
        }
    } 
} = require('#src/infrastructure/database/index.js');


const parseNonNegativeInteger = (value, fallback) => {
    if (value === undefined) return fallback;
    if (value === 'false') return false;
    return Number(value);
};

const queueName = process.env.MAIL_QUEUE_NAME || 'mail';

const mailQueue = new Queue(queueName, {
    connection: redisBullMQClient,
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
        removeOnComplete: parseNonNegativeInteger(
            process.env.MAIL_REMOVE_ON_COMPLETE,
            100
        ),
        removeOnFail: parseNonNegativeInteger(
            process.env.MAIL_REMOVE_ON_FAIL,
            1000
        )
    }
});

const closeMailQueue = async () => {
    await mailQueue.close();
    if (redisBullMQClient.status !== 'end') {
        await redisBullMQClient.quit();
    }
};


module.exports = {
    mailQueue,
    queueName,
    closeMailQueue
};