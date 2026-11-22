const { Queue } = require('bullmq');
const { queue: queueConfig } = require('../config');
const logger = require('../utils/logger');
const createRedisConnection = require('./connection');


const connection = createRedisConnection();

const mailQueue = new Queue(queueConfig.mailQueueName, {
    connection,
    defaultJobOptions: queueConfig.defaultJobOptions
});

connection.on('error', (error) => {
    logger.error(
        { error: error.message },
        'Bull MQ Redis connection error'
    );
});

connection.on('ready', () => {
    logger.info(
        { queue: queueConfig.mailQueueName },
        'Bull MQ Redis connection ready'
    );
});

const enqueueMailJob = async (name, data, options = {}) => {
    if (typeof name !== 'string' || name.trim().length === 0) {
        throw new TypeError('Mail job name is required');
    }
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
        throw new TypeError('Mail job data must be an object');
    }

    return mailQueue.add(name, data, options);
};

const closeMailQueue = async () => {
    await mailQueue.close();
    if (connection.status !== 'end') {
        await connection.quit();
    }
};


module.exports = {
    mailQueue,
    enqueueMailJob,
    closeMailQueue
};
