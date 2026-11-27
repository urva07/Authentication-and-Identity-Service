const app = require('./app');
const healthApp = require('./healthApp');
const config = require('./config/config');
const logger = require('./utils/logger');
const { 
    openSockets: { 
        destroyIdleSockets, 
        openSockets 
    },
    startUpInitializations,
    newSocketsAndItsInflightReqs: {
        logNewSocketAndRegisterInflightReqs,
        registerNewInflightReqToSocket
    },
    configureServer
} = require('./lib');


const PORT = config.apps.mainApp.port;

let mainServer;
let healthServer;
let connections;
let shuttingDown = false;

healthApp.locals.startupComplete = false;
healthApp.locals.shuttingDown = shuttingDown;
app.locals.shuttingDown = shuttingDown;
app.locals.requestCount = 0;

const startServer = async () => {
    healthServer = await new Promise((resolve, reject) => {
        const listeningServer = healthApp.listen(
            config.apps.healthApp.port,
            () => {
                logger.info(
                    {
                        port: config.apps.healthApp.port
                    },
                    'Health application server started'
                );
                resolve(listeningServer);
            }
        );

        listeningServer.once('error', reject);
    });

    await startUpInitializations()

    mainServer = await new Promise((resolve, reject) => {
        const listeningServer = app.listen(PORT, () => {
            logger.info(
                {
                    environment: config.apps.environment,
                    port: PORT,
                    url: 'http://localhost:' + PORT
                },
                'Express mainServer started'
            );
            resolve(listeningServer);
        });

        listeningServer.once('error', reject);
    });

    configureServer(mainServer)

    mainServer.on('connection', logNewSocketAndRegisterInflightReqs);

    mainServer.on('request', registerNewInflightReqToSocket);

    healthApp.locals.startupComplete = true;
};

const shutdown = async (signal) => {
    if (shuttingDown) {
        return;
    }

    shuttingDown = true;
    healthApp.locals.shuttingDown = shuttingDown;
    app.locals.shuttingDown = shuttingDown;
    logger.info({ signal }, 'Shutdown signal received');

    const errors = [];

    const forceCloseTimer = setTimeout(() => {
        mainServer?.closeAllConnections();
        healthServer?.closeAllConnections();
        logger.warn('Force-closing all remaining connections as the grace period has expired');
    }, config.shutdown.forceCloseTimeoutMs);
    forceCloseTimer.unref();

    if (mainServer) {
        const serverClosed = new Promise((resolve) => {
            mainServer.close((error) => {
                if (error) {
                    errors.push(error);
                    logger.error({ err: error }, 'Failed to close HTTP server for new connections');
                }

                resolve();
            });
        });

        logger.info({ activeConnections: openSockets.size }, 'Initiating shutdown for this many active connections');

        mainServer.closeIdleConnections();
        destroyIdleSockets();

        await serverClosed;
    }

    if (healthServer) {
        await new Promise((resolve) => {
            healthServer.close((error) => {
                if (error) {
                    errors.push(error);
                    logger.error(
                        { err: error },
                        'Failed to close health application server'
                    );
                }

                resolve();
            });

            // Health checks are short-lived, so drop any lingering keep-alive sockets
            healthServer.closeAllConnections();
        });
    }

    clearTimeout(forceCloseTimer);

    logger.info('Closed all active connections. You may further get logs from the asynchronous close event of the connections.');

    logger.info('Closing database connections');

    const closeConnections = [
        () => connections?.mongo?.close(),
        () => connections?.mysql?.close(),
        () => connections?.redis?.quit()
    ];

    const closeResults = await Promise.allSettled(
        closeConnections.map(async (closeConnection) => closeConnection())
    );

    for (const result of closeResults) {
        if (result.status === 'rejected') {
            errors.push(result.reason);
            logger.error(
                { err: result.reason },
                'Failed to close a database connection'
            );
        }
    }

    process.exitCode = errors.length > 0 || process.exitCode ? 1 : 0;
};

process.on('beforeExit', (code) => {
    logger.info({ code }, 'Event loop drained');
});

process.on('exit', (code) => {
    console.log('Node.js process exiting:', code);
});

process.on('SIGTERM', () => {
    shutdown('SIGTERM').catch((error) => {
        logger.error({ err: error }, 'Shutdown failed');
        process.exitCode = 1;
    });
});

process.on('SIGINT', () => {
    shutdown('SIGINT').catch((error) => {
        logger.error({ err: error }, 'Shutdown failed');
        process.exitCode = 1;
    });
});

process.on('uncaughtException', (error) => {
    logger.error({ err: error }, 'Uncaught exception');
    process.exitCode = 1;
    shutdown('uncaught exception').catch((shutdownError) => {
        logger.error({ err: shutdownError }, 'Shutdown failed');
        process.exitCode = 1;
    });
});

startServer().catch((error) => {
    logger.fatal({ err: error }, 'Failed to start server');
    process.exitCode = 1;
    if (mainServer || healthServer || connections) {
        shutdown('startup failure').catch((shutdownError) => {
            logger.error({ err: shutdownError }, 'Shutdown failed');
            process.exitCode = 1;
        });
    }
});