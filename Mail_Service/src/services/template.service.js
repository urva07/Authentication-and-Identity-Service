const path = require('path');
const ejs = require('ejs');
const {
    EmailValidationError,
    ExternalServiceError
} = require('../errors');
const {
    MAIL_JOB_NAMES,
    EMAIL_TEMPLATE_REGISTRY
} = require('../constants');


const TEMPLATE_DIRECTORY = path.join(__dirname, '..', 'templates');

const isObject = (value) =>
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value);

const isNonEmptyString = (value) =>
    typeof value === 'string' && value.trim().length > 0;

const htmlToText = (html) =>
    html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/h[1-6]>/gi, '\n')
        .replace(/<\/a>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

const createTemplateService = ({
    templateRenderer = ejs.renderFile,
    templateDirectory = TEMPLATE_DIRECTORY
} = {}) => {
    if (typeof templateRenderer !== 'function') {
        throw new TypeError('Template renderer must be a function');
    }

    const resolveTemplateName = (job) => {
        if (!isObject(job) || !isObject(job.data)) {
            throw new EmailValidationError('Mail job data must be an object');
        }

        return isNonEmptyString(job.data.template)
            ? job.data.template.trim()
            : (
                isNonEmptyString(job.name) &&
                    job.name !== MAIL_JOB_NAMES.SEND_EMAIL
                    ? job.name.trim()
                    : undefined
            );
    };

    const render = async (job) => {
        const templateName = resolveTemplateName(job);

        if (!templateName) {
            throw new EmailValidationError(
                'Mail job requires a supported template'
            );
        }

        const template = EMAIL_TEMPLATE_REGISTRY[templateName];
        if (!template) {
            throw new EmailValidationError(
                `Unsupported mail template: ${templateName}`
            );
        }

        const templateData = isObject(job.data.data)
            ? job.data.data
            : job.data;

        const missingFields = template.requiredFields.filter(
            (field) => !isNonEmptyString(templateData[field])
        );
        if (missingFields.length > 0) {
            throw new EmailValidationError(
                `Missing template fields: ${missingFields.join(', ')}`
            );
        }

        const templatePath = path.join(templateDirectory, template.fileName);

        try {
            const html = await templateRenderer(templatePath, templateData);

            return {
                templateName,
                subject: isNonEmptyString(job.data.subject)
                    ? job.data.subject.trim()
                    : template.subject,
                html,
                text: htmlToText(html)
            };
        } catch (error) {
            if (error instanceof EmailValidationError) {
                throw error;
            }
            throw new ExternalServiceError(
                `Failed to render mail template: ${templateName}`
            );
        }
    };

    return { render };
};


module.exports = createTemplateService;