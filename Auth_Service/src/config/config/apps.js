const logger = require('#src/utils/logger.js');

const appsConfig = {
    environment: process.env.ENVIRONMENT || 'development',
    mainApp: {
        domain: process.env.DOMAIN || 'localhost',
        port: process.env.PORT === undefined ? 3000 : Number(process.env.PORT),
        apiBaseUrl: process.env.API_BASE_URL || `http://localhost:${process.env.PORT === undefined ? 3000 : (Number(process.env.PORT) || 3000)}`,
        corsOrigin: process.env.CORS_ORIGIN,
        externalApiTimeoutMs: Number(process.env.EXTERNAL_API_TIMEOUT_MS) || 15000,
        totalReqResCycleTimeOutMs: Number(process.env.TOTAL_REQ_RES_CYCLE_TIMEOUT_MS) || 15000,
        connectionKeepAliveTimeoutMs: Number(process.env.CONNECTION_KEEP_ALIVE_TIMEOUT_MS) || 20000,
        connectionInactivityTimeoutMs: Number(process.env.CONNECTION_INACTIVITY_TIMEOUT_MS) || 10000,
        reqHeadersTimeoutMs: Number(process.env.REQ_HEADERS_TIMEOUT_MS) || 5000,
        reqTimeoutMs: Number(process.env.REQ_TIMEOUT_MS) || 20000,
        maxConnections: Number(process.env.MAX_CONNECTIONS) || 1000,
        bodySizeLimit: process.env.BODY_SIZE_LIMIT || '10kb'
    },
    healthApp: {
        port: process.env.HEALTH_APP_PORT === undefined
            ? 3001
            : Number(process.env.HEALTH_APP_PORT)
    }
};

const isValidPort = (port) =>
    Number.isInteger(port) && port >= 1 && port <= 65535;

const invalidConfigs = [];

if (!isValidPort(appsConfig.mainApp.port)) {
    invalidConfigs.push('PORT');
}
if (!isValidPort(appsConfig.healthApp.port)) {
    invalidConfigs.push('HEALTH_APP_PORT');
}
if (appsConfig.mainApp.port === appsConfig.healthApp.port) {
    invalidConfigs.push('PORT/HEALTH_APP_PORT');
}

try {
    const apiUrl = new URL(appsConfig.mainApp.apiBaseUrl);
    if (!['http:', 'https:'].includes(apiUrl.protocol)) {
        invalidConfigs.push('API_BASE_URL');
    }
} catch {
    invalidConfigs.push('API_BASE_URL');
}

if (invalidConfigs.length > 0) {
    logger.fatal(
        { invalidConfigs },
        'Critical application configuration is missing or invalid'
    );
    process.exit(1);
}

module.exports = appsConfig;