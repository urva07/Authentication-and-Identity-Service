const EMAIL_SUBJECTS = Object.freeze({
    VERIFY_EMAIL: 'Verify your email address',
    RESET_PASSWORD: 'Reset your password'
});

const AUTH_MESSAGES = Object.freeze({
    VERIFICATION_SENT: 'A verification link has been sent to your email. Please verify your email to continue.',
    PASSWORD_RESET_REQUEST_SENT: 'If an account exists for this email, a password reset link has been sent.'
});


module.exports = {
    EMAIL_SUBJECTS,
    AUTH_MESSAGES
};
