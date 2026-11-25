const nodemailer = require('nodemailer');
const config = require('../config');
const { ExternalServiceError } = require('../errors');


const createMailClient = (emailConfig = config.email) => {
    if (!emailConfig.host) {
        throw new ExternalServiceError(
            'Email configuration requires EMAIL_HOST'
        );
    }

    if (
        (emailConfig.user && !emailConfig.password) ||
        (!emailConfig.user && emailConfig.password)
    ) {
        throw new ExternalServiceError(
            'Email configuration must provide both EMAIL_USER and EMAIL_PASSWORD'
        );
    }

    const transporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        ...(emailConfig.user && emailConfig.password
            ? {
                auth: {
                    user: emailConfig.user,
                    pass: emailConfig.password
                }
            }
            : {}),
        connectionTimeout: emailConfig.timeout,
        greetingTimeout: emailConfig.timeout,
        socketTimeout: emailConfig.timeout
    });

    return transporter;
};


module.exports = createMailClient;