const logger = require('#src/utils/logger.js');
const { mailQueue, queueName } = require('./mailQueue');
const {
    EMAIL_TEMPLATES
} = require('#src/constants/index.js');


const isObject = (value) =>
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value);

const isNonEmptyString = (value) =>
    typeof value === 'string' && value.trim().length > 0;

const addMailJob = async ({
    name,
    to,
    template,
    subject,
    data,
    options = {}
}) => {
    if (!isNonEmptyString(name)) {
        throw new TypeError('Mail job name is required');
    }
    if (!isNonEmptyString(to)) {
        throw new TypeError('Mail recipient is required');
    }
    if (!isNonEmptyString(template)) {
        throw new TypeError('Mail template is required');
    }
    if (!isObject(data)) {
        throw new TypeError('Mail template data must be an object');
    }
    if (!isObject(options)) {
        throw new TypeError('Mail job options must be an object');
    }
    if (subject !== undefined && !isNonEmptyString(subject)) {
        throw new TypeError('Mail subject must be a non-empty string');
    }

    const job = await mailQueue.add(
        name,
        {
            to: to.trim(),
            template: template.trim(),
            ...(subject ? { subject: subject.trim() } : {}),
            data
        },
        options
    );

    logger.info(
        {
            queue: queueName,
            jobId: job.id,
            jobName: job.name,
            template
        },
        'Mail job produced'
    );

    return job;
};

const produceVerifyEmailJob = async ({
    to,
    name,
    verificationUrl,
    tokenExpiry,
    subject,
    options
}) => addMailJob({
    name: EMAIL_TEMPLATES.VERIFY_EMAIL,
    to,
    template: EMAIL_TEMPLATES.VERIFY_EMAIL,
    subject,
    data: {
        name,
        verificationUrl,
        tokenExpiry
    },
    options
});

const produceForgotPasswordJob = async ({
    to,
    name,
    resetUrl,
    tokenExpiry,
    subject,
    options
}) => addMailJob({
    name: EMAIL_TEMPLATES.FORGOT_PASSWORD,
    to,
    template: EMAIL_TEMPLATES.FORGOT_PASSWORD,
    subject,
    data: {
        name,
        resetUrl,
        tokenExpiry
    },
    options
});


module.exports = {
    addMailJob,
    produceVerifyEmailJob,
    produceForgotPasswordJob
};
