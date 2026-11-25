const config = require('./config');
const createMailProcessor = require('./processors');
const { createMailWorker, closeMailWorker } = require('./workers');
const logger = require('./utils/logger');


let mailWorker;
let shutdownPromise;

const startServer = async () => {
    if (mailWorker) {
        throw new Error('Mail worker is already running');
    }

    const processor = createMailProcessor();
    mailWorker = createMailWorker(processor.processMailJob);

    await mailWorker.worker.waitUntilReady();
    logger.info(
        {
            queue: config.queue.mailQueueName,
            concurrency: config.worker.concurrency
        },
        'Mail worker started'
    );

    return mailWorker;
};

const shutdown = async (exitCode = 0) => {
    if (shutdownPromise) {
        return shutdownPromise;
    }

    shutdownPromise = (async () => {
        logger.info('Graceful mail worker shutdown started');

        let forceCloseTimeout;

        try {
            await Promise.race([
                mailWorker
                    ? closeMailWorker(mailWorker)
                    : Promise.resolve(),
                new Promise((_, reject) => {
                    forceCloseTimeout = setTimeout(() => {
                        reject(
                            new Error(
                                'Graceful shutdown timed out; forcing worker exit'
                            )
                        );
                    }, config.shutdown.forceCloseTimeoutMs);
                })
            ]);

            mailWorker = undefined;
            logger.info('Mail worker shut down successfully');
            process.exitCode = exitCode;
        } catch (error) {
            logger.fatal(
                { error: error.message },
                'Mail worker shutdown failed'
            );
            process.exitCode = exitCode || 1;
            process.exit(process.exitCode);
        } finally {
            if (forceCloseTimeout) {
                clearTimeout(forceCloseTimeout);
            }
        }
    })();

    return shutdownPromise;
};

const handleSignal = (signal) => {
    logger.info({ signal }, 'Shutdown signal received');
    shutdown(0).catch((error) => {
        logger.fatal(
            { error: error.message },
            'Unable to complete graceful shutdown'
        );
        process.exit(1);
    });
};

if (require.main === module) {
    process.once('SIGTERM', () => handleSignal('SIGTERM'));
    process.once('SIGINT', () => handleSignal('SIGINT'));

    startServer().catch((error) => {
        logger.fatal(
            { error: error.message },
            'Mail worker failed to start'
        );
        shutdown(1);
    });
}


module.exports = {
    startServer,
    shutdown
};
