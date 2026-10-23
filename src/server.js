const app = require('./app');
const config = require('./config/config');
const initializeConnections = require('./config');
const { configureRepositories } = require('./repositories');
const logger = require('./utils/logger');
const createHealthApp = require('./healthApp');

const PORT = config.app.port;

let server;
let healthServer;
let connections;
let shuttingDown = false;
let startupComplete = false;

const healthApp = createHealthApp(() => startupComplete);

const startServer = async () => {
    healthServer = await new Promise((resolve, reject) => {
        const listeningServer = healthApp.listen(
            config.healthApp.port,
            () => {
                logger.info(
                    {
                        port: config.healthApp.port,
                        path: '/startup'
                    },
                    'Health application server started'
                );
                resolve(listeningServer);
            }
        );

        listeningServer.once('error', reject);
    });

    connections = await initializeConnections();
    config.runtime.db_connections = connections;
    configureRepositories(connections.mysql.models);
    
    server = await new Promise((resolve, reject) => {
        const listeningServer = app.listen(PORT, () => {
            logger.info(
                {
                    environment: config.app.environment,
                    port: PORT,
                    url: 'http://localhost:' + PORT
                },
                'Express server started'
            );
            resolve(listeningServer);
        });

        listeningServer.once('error', reject);
    });

    server.on('connection', (socket) => {
        logger.info(
            'New connection from ' +
                socket.remoteAddress +
                ':' +
                socket.remotePort
        );
    });

    startupComplete = true;
};

const shutdown = async (signal) => {
    if (shuttingDown) {
        return;
    }

    shuttingDown = true;
    logger.info({ signal }, 'Shutdown signal received');

    const errors = [];

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
        });
    }

    if (server) {
        const serverClosed = new Promise((resolve) => {
            server.close((error) => {
                if (error) {
                    errors.push(error);
                    logger.error({ err: error }, 'Failed to close HTTP server for new connections');
                }

                resolve();
            });
        });

        await new Promise((resolve) => {
            const waitForConnectionsToClose = () => {
                server.getConnections((error, activeConnections) => {
                    if (error) {
                        errors.push(error);
                        logger.error(
                            { err: error },
                            'Failed to check active connections'
                        );
                        serverClosed.then(resolve);
                        return;
                    }

                    if (activeConnections === 0) {
                        resolve();
                        return;
                    }

                    setImmediate(waitForConnectionsToClose);
                });
            };

            waitForConnectionsToClose();
        });

        await serverClosed;
    }

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
    logger.info('Shutdown complete');
    process.exit();
};

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

startServer().catch((error) => {
    logger.error({ err: error }, 'Failed to start server');
    process.exitCode = 1;
    if (server || healthServer || connections) {
        shutdown('startup failure').catch((shutdownError) => {
            logger.error({ err: shutdownError }, 'Shutdown failed');
            process.exitCode = 1;
        });
    }
});
