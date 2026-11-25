const createEmailService = require('../services/email.service');
const createTemplateService = require('../services/template.service');
const defaultLogger = require('../utils/logger');
const {
    EmailValidationError,
    ExternalServiceError,
    AppError
} = require('../errors');
const {
    MAIL_JOB_NAMES,
    EMAIL_TEMPLATES
} = require('../constants');

const isObject = (value) =>
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value);

const isNonEmptyString = (value) =>
    typeof value === 'string' && value.trim().length > 0;

const createMailProcessor = ({
    emailService = createEmailService(),
    templateService = createTemplateService(),
    logger = defaultLogger
} = {}) => {
    if (
        typeof emailService?.sendEmail !== 'function'
    ) {
        throw new TypeError('Email service must provide a sendEmail method');
    }
    if (typeof templateService?.render !== 'function') {
        throw new TypeError('Template service must provide a render method');
    }

    const processMailJob = async (job) => {
        if (!isObject(job) || !isObject(job.data)) {
            throw new EmailValidationError('Mail job data must be an object');
        }

        const data = job.data;
        if (!isNonEmptyString(data.to)) {
            throw new EmailValidationError('Mail recipient is required');
        }

        const templateName =
            isNonEmptyString(data.template)
                ? data.template.trim()
                : (
                    isNonEmptyString(job.name) &&
                        job.name !== MAIL_JOB_NAMES.SEND_EMAIL
                        ? job.name.trim()
                        : undefined
                );

        let rendered;

        if (templateName === EMAIL_TEMPLATES.DIRECT) {
            const directData = isObject(data.data) ? data.data : data;
            const subject = isNonEmptyString(data.subject)
                ? data.subject.trim()
                : (
                    isNonEmptyString(directData.subject)
                        ? directData.subject.trim()
                        : undefined
                );
            const text = isNonEmptyString(directData.text)
                ? directData.text.trim()
                : undefined;
            const html = isNonEmptyString(directData.html)
                ? directData.html.trim()
                : undefined;

            if (!isNonEmptyString(subject)) {
                throw new EmailValidationError('Mail subject is required');
            }
            if (!text && !html) {
                throw new EmailValidationError(
                    'Email text or HTML content is required'
                );
            }

            rendered = {
                templateName: EMAIL_TEMPLATES.DIRECT,
                subject,
                text,
                html
            };
        } else {
            rendered = await templateService.render(job);
        }

        try {
            const result = await emailService.sendEmail({
                to: data.to.trim(),
                subject: rendered.subject,
                html: rendered.html,
                text: rendered.text
            });

            logger.info(
                {
                    jobId: job.id,
                    template: rendered.templateName,
                    recipient: data.to.trim()
                },
                'Mail job processed'
            );

            return result;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new ExternalServiceError(
                `Failed to send mail using template: ${rendered.templateName}`
            );
        }
    };

    return { processMailJob };
};


module.exports = createMailProcessor;