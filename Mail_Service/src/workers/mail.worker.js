const { Worker } = require('bullmq');
const { queue: queueConfig, worker: workerConfig } = require('../config');
const createRedisConnection = require('../queues/connection');
const logger = require('../utils/logger');


const createMailWorker = (processor) => {
    if (typeof processor !== 'function') {
        throw new TypeError('A mail job processor function is required');
    }

    const connection = createRedisConnection();
    const worker = new Worker(
        queueConfig.mailQueueName,
        processor,
        {
            connection,
            concurrency: workerConfig.concurrency,
            maxStalledCount: workerConfig.maxStalledCount,
            stalledInterval: workerConfig.stalledInterval,
            lockDuration: workerConfig.lockDuration
        }
    );

    connection.on('error', (error) => {
        logger.error(
            { err: error },
            'Bull MQ worker Redis connection error'
        );
    });

    connection.on('ready', () => {
        logger.info(
            { queue: queueConfig.mailQueueName },
            'Bull MQ worker Redis connection ready'
        );
    });

    worker.on('completed', (job, result) => {
        logger.info(
            { jobId: job.id, jobName: job.name, result },
            'Mail job completed'
        );
    });

    worker.on('failed', (job, error) => {
        logger.error(
            {
                jobId: job?.id,
                jobName: job?.name,
                attemptsMade: job?.attemptsMade,
                err: error
            },
            'Mail job failed'
        );
    });

    worker.on('stalled', (jobId) => {
        logger.warn(
            { jobId },
            'Mail job stalled'
        );
    });

    worker.on('error', (error) => {
        logger.error(
            { err: error },
            'Bull MQ worker error'
        );
    });

    return { worker, connection };
};

const closeMailWorker = async (mailWorker) => {
    if (!mailWorker?.worker) {
        throw new TypeError('A mail worker instance is required');
    }

    await mailWorker.worker.close();
    if (mailWorker.connection.status !== 'end') {
        await mailWorker.connection.quit();
    }
};


module.exports = {
    createMailWorker,
    closeMailWorker
};