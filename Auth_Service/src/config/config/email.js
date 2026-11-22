const logger = require('#src/utils/logger.js');

const emailConfig = {
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM
};

const isMissing = (value) =>
    typeof value !== 'string' || value.trim().length === 0;

const invalidConfigs = [];

if (isMissing(emailConfig.host)) {
    invalidConfigs.push('EMAIL_HOST');
}
if (
    !Number.isInteger(emailConfig.port) ||
    emailConfig.port < 1 ||
    emailConfig.port > 65535
) {
    invalidConfigs.push('EMAIL_PORT');
}
if (isMissing(emailConfig.from)) {
    invalidConfigs.push('EMAIL_FROM');
}
if (
    (isMissing(emailConfig.user) && !isMissing(emailConfig.password)) ||
    (!isMissing(emailConfig.user) && isMissing(emailConfig.password))
) {
    invalidConfigs.push('EMAIL_USER/EMAIL_PASSWORD');
}

if (invalidConfigs.length > 0) {
    logger.fatal(
        { invalidConfigs },
        'Critical email configuration is missing or invalid'
    );
    process.exit(1);
}

module.exports = emailConfig;