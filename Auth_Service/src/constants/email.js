const EMAIL_DELIVERY_MODES = Object.freeze({
    SYNC: 'sync',
    ASYNC: 'async'
});

const EMAIL_TEMPLATES = Object.freeze({
    DIRECT: 'direct',
    VERIFY_EMAIL: 'verify-email',
    FORGOT_PASSWORD: 'forgot-password'
});

const EMAIL_TEMPLATE_REGISTRY = Object.freeze({
    [EMAIL_TEMPLATES.VERIFY_EMAIL]: Object.freeze({
        fileName: 'verifyEmail.ejs',
        requiredFields: Object.freeze([
            'name',
            'verificationUrl',
            'tokenExpiry'
        ])
    }),
    [EMAIL_TEMPLATES.FORGOT_PASSWORD]: Object.freeze({
        fileName: 'forgotPassword.ejs',
        requiredFields: Object.freeze([
            'name',
            'resetUrl',
            'tokenExpiry'
        ])
    })
});


module.exports = {
    EMAIL_DELIVERY_MODES,
    EMAIL_TEMPLATES,
    EMAIL_TEMPLATE_REGISTRY
};
