const app = require('./app');
const healthApp = require('./healthApp');
const config = require('./config/config');
const { 
    initializeConnections, 
    dbs: { 
        mysql,
        redis,
    } 
} = require('#src/infrastructure/database/index.js');
const { 
    mysql: { 
        configureRepositories: configureMysqlRepositories 
    },
    redis: {
        userCache: {
            configureRepositories: configureUserCacheRedisRepositories
        }
    }
} = require('./repositories');
const logger = require('./utils/logger');
const { 
    openSockets: { 
        destroyIdleSockets, 
        openSockets 
    } 
} = require('./lib');


const PORT = config.apps.mainApp.port;

let server;
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

    connections = await initializeConnections();
    configureMysqlRepositories(mysql.models);
    configureUserCacheRedisRepositories(redis.redisCacheClient);

    
    server = await new Promise((resolve, reject) => {
        const listeningServer = app.listen(PORT, () => {
            logger.info(
                {
                    environment: config.apps.mainApp.environment,
                    port: PORT,
                    url: 'http://localhost:' + PORT
                },
                'Express server started'
            );
            resolve(listeningServer);
        });

        listeningServer.once('error', reject);
    });

    server.setTimeout(config.apps.mainApp.connectionInactivityTimeoutMs);
    server.keepAliveTimeout = config.apps.mainApp.connectionKeepAliveTimeoutMs;
    server.headersTimeout = config.apps.mainApp.reqHeadersTimeoutMs;
    server.requestTimeout = config.apps.mainApp.reqTimeoutMs;
    server.maxConnections = config.apps.mainApp.maxConnections;

    server.on('connection', (socket) => {
        logger.info(
            'New connection from ' +
                socket.remoteAddress +
                ':' +
                socket.remotePort
        );

        socket.inflightRequests = 0;
        openSockets.add(socket);
        socket.once('close', () => {
            logger.info(
                'Connection closed from ' +
                    socket.remoteAddress +
                    ':' +
                    socket.remotePort
            );
            openSockets.delete(socket);
        });
    });

    server.on('request', (req, res) => {
        const socket = req.socket;
        socket.inflightRequests += 1;

        res.once('close', () => {
            socket.inflightRequests -= 1;

            if (shuttingDown && socket.inflightRequests === 0) {
                socket.destroy();
            }
        });
    });

    healthApp.locals.startupComplete = true;
};

const shutdown = async (signal) => {
    if (shuttingDown) {
        return;
    }

    logger.info({ signal }, 'Shutdown signal received');
    shuttingDown = true;
    app.locals.shuttingDown = shuttingDown;

    const errors = [];

    const forceCloseTimer = setTimeout(() => {
        server?.closeAllConnections();
        healthServer?.closeAllConnections();
        logger.warn('Force-closing all remaining connections as the grace period has expired');
    }, config.shutdown.forceCloseTimeoutMs);
    forceCloseTimer.unref();

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

        logger.info({ activeConnections: openSockets.size }, 'Initiating shutdown for this many active connections');

        server.closeIdleConnections();
        destroyIdleSockets();

        await serverClosed;

        clearTimeout(forceCloseTimer);
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

    logger.info('Closed all active connections. You may further get logs from the asynchronous close event of the connections.');

    logger.info('Closing database connections');

    const closeConnections = [
        () => { connections?.mongo?.close(); logger.info('Closed MongoDB connection'); },
        () => { connections?.mysql?.close(); logger.info('Closed MySQL connection'); },
        () => { connections?.redis?.quit(); logger.info('Closed Redis connection'); }
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
    if (server || healthServer || connections) {
        shutdown('startup failure').catch((shutdownError) => {
            logger.error({ err: shutdownError }, 'Shutdown failed');
            process.exitCode = 1;
        });
    }
});