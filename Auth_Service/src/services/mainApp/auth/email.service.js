const config = require('#src/config/config/index.js');
const { ExternalServiceTimeoutError } = require('#src/errors/index.js');
const createMailClient = require('#src/integrations/mailClient.js');
const defaultLogger = require('#src/utils/logger.js');

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

    const emailTransport = transporter || createMailClient(emailConfig);

    const sendEmail = async ({ to, subject, text, html }, abortSignal, logger = defaultLogger) => {
        logger.debug('Validating email request');

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

        const aborted = new Promise((_, reject) => {
            if (abortSignal) {
                abortSignal.addEventListener('abort', () => {
                    logger.debug('Email sending aborted due to timeout');
                    reject(new ExternalServiceTimeoutError('Email sending aborted due to timeout'));
                });
            }
        });

        logger.debug('Sending email');

        return Promise.race([
            emailTransport.sendMail({
                from: emailConfig.from,
                to: to.trim(),
                subject,
                ...(text ? { text } : {}),
                ...(html ? { html } : {})
            }),
            aborted
        ]).then((result) => {
            logger.debug('Email sent successfully');
            return result;
        }).catch((error) => {
            logger.debug('Email sending failed', { error: error.message });
            throw error;
        });
    };

    return { sendEmail };
};


module.exports = createEmailService;
