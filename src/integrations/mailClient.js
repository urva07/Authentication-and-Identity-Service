const nodemailer = require('nodemailer');
const config = require('../config/config');

const createMailClient = (emailConfig = config.email) => {
    if (!emailConfig.host) {
        throw new Error('Email configuration requires EMAIL_HOST');
    }

    if (
        (emailConfig.user && !emailConfig.password) ||
        (!emailConfig.user && emailConfig.password)
    ) {
        throw new Error(
            'Email configuration must provide both EMAIL_USER and EMAIL_PASSWORD'
        );
    }

    return nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth: {
            user: emailConfig.user,
            pass: emailConfig.password
        }
    });
};

module.exports = createMailClient;
