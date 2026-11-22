const logger = require('../utils/logger');

const forceCloseTimeoutMs = process.env.FORCE_CLOSE_TIMEOUT_MS === undefined
    ? 20000
    : Number(process.env.FORCE_CLOSE_TIMEOUT_MS);

if (!Number.isInteger(forceCloseTimeoutMs) || forceCloseTimeoutMs < 1) {
    logger.fatal(
        { invalidConfigs: ['FORCE_CLOSE_TIMEOUT_MS'] },
        'Critical shutdown configuration is missing or invalid'
    );
    process.exit(1);
}

module.exports = { forceCloseTimeoutMs };
