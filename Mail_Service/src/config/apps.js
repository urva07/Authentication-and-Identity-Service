const logger = require('../utils/logger');

const environment = process.env.ENVIRONMENT || 'development';

const appsConfig = {
    environment,
    serviceName: process.env.SERVICE_NAME || 'mail-service',
    port: process.env.PORT === undefined ? 3000 : Number(process.env.PORT),
    healthApp: {
        port: process.env.HEALTH_APP_PORT === undefined
            ? 3001
            : Number(process.env.HEALTH_APP_PORT)
    }
};

const isValidPort = (port) =>
    Number.isInteger(port) && port >= 1 && port <= 65535;

const invalidConfigs = [];

if (!isValidPort(appsConfig.port)) {
    invalidConfigs.push('PORT');
}
if (!isValidPort(appsConfig.healthApp.port)) {
    invalidConfigs.push('HEALTH_APP_PORT');
}
if (appsConfig.port === appsConfig.healthApp.port) {
    invalidConfigs.push('PORT/HEALTH_APP_PORT');
}
if (!['development', 'test', 'production'].includes(environment)) {
    invalidConfigs.push('ENVIRONMENT');
}

if (invalidConfigs.length > 0) {
    logger.fatal(
        { invalidConfigs },
        'Critical application configuration is missing or invalid'
    );
    process.exit(1);
}

module.exports = appsConfig;
