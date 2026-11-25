const config = require('#src/config/config/index.js');
const { ExternalServiceTimeoutError } = require('#src/errors/index.js');
const createMailClient = require('#src/integrations/mailClient.js');
const defaultLogger = require('#src/utils/logger.js');
const path = require('node:path');
const ejs = require('ejs');
const {
    EMAIL_DELIVERY_MODES,
    EMAIL_TEMPLATES,
    EMAIL_TEMPLATE_REGISTRY
} = require('#src/constants/index.js');
const { bullMQ: asyncProducer } = require('#src/infrastructure/messaging/index.js');


const TEMPLATE_DIRECTORY = path.join(__dirname, '../../../views/emailTemplates');

const isObject = (value) =>
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value);

const isNonEmptyString = (value) =>
    typeof value === 'string' && value.trim().length > 0;


const createEmailService = ({
    transporter,
    emailConfig = config.email,
    deliveryMode = emailConfig.deliveryMode || EMAIL_DELIVERY_MODES.SYNC,
    mailProducer
} = {}) => {
    if (!Object.values(EMAIL_DELIVERY_MODES).includes(deliveryMode)) {
        throw new TypeError('Email delivery mode must be sync or async');
    }

    let emailTransport;
    mailProducer = mailProducer || asyncProducer;

    if (deliveryMode === EMAIL_DELIVERY_MODES.SYNC) {
        if (
            transporter !== undefined &&
            typeof transporter?.sendMail !== 'function'
        ) {
            throw new TypeError('Email transport must provide a sendMail method');
        }

        if (!emailConfig.from) {
            throw new Error('Email configuration requires EMAIL_FROM');
        }

        emailTransport = transporter || createMailClient(emailConfig);
    }

    const validateEmailRequest = ({
        to,
        subject,
        text,
        html,
        template,
        templateData
    }) => {
        if (typeof to !== 'string' || to.trim().length === 0) {
            throw new TypeError('Email recipient is required');
        }

        if (typeof subject !== 'string' || subject.trim().length === 0) {
            throw new TypeError('Email subject is required');
        }

        if (template !== undefined) {
            if (!isNonEmptyString(template)) {
                throw new TypeError('Email template is required');
            }

            const templateConfig = EMAIL_TEMPLATE_REGISTRY[template];
            if (!templateConfig) {
                throw new TypeError(`Unsupported email template: ${template}`);
            }
            if (!isObject(templateData)) {
                throw new TypeError('Email template data is required');
            }

            const missingFields = templateConfig.requiredFields.filter(
                (field) => !isNonEmptyString(templateData[field])
            );
            if (missingFields.length > 0) {
                throw new TypeError(
                    `Missing email template fields: ${missingFields.join(', ')}`
                );
            }
        } else if (
            (typeof text !== 'string' || text.length === 0) &&
            (typeof html !== 'string' || html.length === 0)
        ) {
            throw new TypeError('Email text or HTML content is required');
        }
    };

    const renderEmailTemplate = async (template, templateData) => {
        const templateConfig = EMAIL_TEMPLATE_REGISTRY[template];
        if (!templateConfig) {
            throw new TypeError(`Unsupported email template: ${template}`);
        }

        return ejs.renderFile(
            path.join(TEMPLATE_DIRECTORY, templateConfig.fileName),
            templateData
        );
    };

    const sendEmailSynchronously = async (
        { to, subject, text, html, template, templateData },
        abortSignal,
        logger = defaultLogger
    ) => {
        validateEmailRequest({
            to,
            subject,
            text,
            html,
            template,
            templateData
        });
        logger.debug('Validating email request');

        if (emailTransport === undefined) {
            throw new Error(
                'Synchronous email transport is not configured'
            );
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

        let renderedHtml = html;
        if (template !== undefined) {
            renderedHtml = await renderEmailTemplate(template, templateData);
        }

        return Promise.race([
            emailTransport.sendMail({
                from: emailConfig.from,
                to: to.trim(),
                subject,
                ...(text ? { text } : {}),
                ...(renderedHtml ? { html: renderedHtml } : {})
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

    const sendEmailAsynchronously = async (
        { to, subject, text, html, template, templateData },
        logger = defaultLogger
    ) => {
        validateEmailRequest({
            to,
            subject,
            text,
            html,
            template,
            templateData
        });
        logger.debug('Validating email request');

        if (typeof mailProducer.addMailJob !== 'function') {
            throw new TypeError(
                'Async mail producer must provide an addMailJob method'
            );
        }

        const job = await mailProducer.addMailJob(
            template
                ? {
                    name: template,
                    to: to.trim(),
                    template,
                    subject,
                    data: templateData
                }
                : {
                    name: 'send-email',
                    to: to.trim(),
                    template: EMAIL_TEMPLATES.DIRECT,
                    subject,
                    data: {
                        ...(text ? { text } : {}),
                        ...(html ? { html } : {})
                    }
                }
        );

        logger.info(
            { jobId: job.id, queue: mailProducer.queueName },
            'Email job queued'
        );

        return {
            queued: true,
            jobId: job.id
        };
    };

    const sendEmail = async (
        mail,
        abortSignal,
        logger = defaultLogger
    ) =>
        deliveryMode === EMAIL_DELIVERY_MODES.ASYNC
            ? sendEmailAsynchronously(mail, logger)
            : sendEmailSynchronously(mail, abortSignal, logger);

    return {
        sendEmail,
        sendEmailSynchronously,
        sendEmailAsynchronously
    };
};


module.exports = createEmailService;