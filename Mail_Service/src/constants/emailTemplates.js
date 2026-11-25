const EMAIL_TEMPLATES = Object.freeze({
    DIRECT: 'direct',
    VERIFY_EMAIL: 'verify-email',
    FORGOT_PASSWORD: 'forgot-password'
});

const EMAIL_SUBJECTS = Object.freeze({
    VERIFY_EMAIL: 'Verify your email address',
    FORGOT_PASSWORD: 'Reset your password'
});

const EMAIL_TEMPLATE_REGISTRY = Object.freeze({
    [EMAIL_TEMPLATES.VERIFY_EMAIL]: Object.freeze({
        fileName: 'verifyEmail.ejs',
        subject: EMAIL_SUBJECTS.VERIFY_EMAIL,
        requiredFields: Object.freeze([
            'name',
            'verificationUrl',
            'tokenExpiry'
        ])
    }),
    [EMAIL_TEMPLATES.FORGOT_PASSWORD]: Object.freeze({
        fileName: 'forgotPassword.ejs',
        subject: EMAIL_SUBJECTS.FORGOT_PASSWORD,
        requiredFields: Object.freeze([
            'name',
            'resetUrl',
            'tokenExpiry'
        ])
    })
});


module.exports = {
    EMAIL_TEMPLATES,
    EMAIL_SUBJECTS,
    EMAIL_TEMPLATE_REGISTRY
};