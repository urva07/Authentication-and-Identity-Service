const config = require('#src/config/index.js');
const {
    EmailValidationError,
    ExternalServiceError,
    ExternalServiceTimeoutError
} = require('#src/errors/index.js');
const createMailClient = require('#src/integrations/mailClient.js');
const logger = require('#src/utils/logger.js');


const createEmailService = ({ transporter, emailConfig = config.email } = {}) => {
    if (
        transporter !== undefined &&
        typeof transporter?.sendMail !== 'function'
    ) {
        throw new TypeError('Email transport must provide a sendMail method');
    }

    if (!emailConfig.from) {
        throw new ExternalServiceError(
            'Email configuration requires EMAIL_FROM'
        );
    }

    const emailTransport = transporter || createMailClient(emailConfig);

    const sendEmail = async ({ to, subject, text, html }) => {
        logger.debug('Validating email request');

        if (typeof to !== 'string' || to.trim().length === 0) {
            throw new EmailValidationError('Email recipient is required');
        }

        if (typeof subject !== 'string' || subject.trim().length === 0) {
            throw new EmailValidationError('Email subject is required');
        }

        if (
            (typeof text !== 'string' || text.length === 0) &&
            (typeof html !== 'string' || html.length === 0)
        ) {
            throw new EmailValidationError(
                'Email text or HTML content is required'
            );
        }

        logger.debug('Sending email');

        let timeoutId;
        const timeout = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                logger.debug('Email sending aborted due to timeout');
                reject(
                    new ExternalServiceTimeoutError(
                        'Email sending aborted due to timeout'
                    )
                );
            }, emailConfig.timeout);
        });

        try {
            const result = await Promise.race([
                emailTransport.sendMail({
                    from: emailConfig.from,
                    to: to.trim(),
                    subject,
                    ...(text ? { text } : {}),
                    ...(html ? { html } : {})
                }),
                timeout
            ]);

            logger.debug('Email sent successfully');
            return result;
        } catch (error) {
            logger.debug('Email sending failed', { error: error.message });

            if (
                error instanceof EmailValidationError ||
                error instanceof ExternalServiceError ||
                error instanceof ExternalServiceTimeoutError
            ) {
                throw error;
            }

            if (
                error.code === 'ETIMEDOUT' ||
                error.code === 'ESOCKET' ||
                error.code === 'ECONNECTION'
            ) {
                throw new ExternalServiceTimeoutError(
                    'Email provider request timed out'
                );
            }

            throw new ExternalServiceError(
                'Email provider could not send the message'
            );
        } finally {
            clearTimeout(timeoutId);
            logger.debug('Timeout cleared');
        }
    };

    return { sendEmail };
};


module.exports = createEmailService;