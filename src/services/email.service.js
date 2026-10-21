const config = require('../config/config');
const createMailClient = require('../config/mail');

const createEmailService = ({ transporter, emailConfig = config.email } = {}) => {
    if (
        transporter !== undefined &&
        typeof transporter?.sendMail !== 'function'
    ) {
        throw new TypeError('Email transport must provide a sendMail method');
    }

    if (!emailConfig.from) {
        throw new Error('Email configuration requires EMAIL_FROM');
    }

    const emailTransport =
        transporter ||
        createMailClient(emailConfig);

    const sendEmail = async ({ to, subject, text, html }) => {
        if (typeof to !== 'string' || to.trim().length === 0) {
            throw new TypeError('Email recipient is required');
        }

        if (typeof subject !== 'string' || subject.trim().length === 0) {
            throw new TypeError('Email subject is required');
        }

        if (
            (typeof text !== 'string' || text.length === 0) &&
            (typeof html !== 'string' || html.length === 0)
        ) {
            throw new TypeError('Email text or HTML content is required');
        }

        return emailTransport.sendMail({
            from: emailConfig.from,
            to: to.trim(),
            subject,
            ...(text ? { text } : {}),
            ...(html ? { html } : {})
        });
    };

    return { sendEmail };
};

module.exports = createEmailService;
