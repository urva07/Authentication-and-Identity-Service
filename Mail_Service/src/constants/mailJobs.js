const MAIL_QUEUE_NAMES = Object.freeze({
    MAIL: 'mail'
});

const MAIL_JOB_NAMES = Object.freeze({
    SEND_EMAIL: 'send-email',
    VERIFY_EMAIL: 'verify-email',
    FORGOT_PASSWORD: 'forgot-password'
});


module.exports = {
    MAIL_QUEUE_NAMES,
    MAIL_JOB_NAMES
};
