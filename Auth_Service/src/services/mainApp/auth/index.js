module.exports = {
    "login.service": require('./login.service'),
    "verify.service": require('./verify.service'),
    "verify-email.service": require('./verifyEmail.service'),
    "refresh.service": require('./refresh.service'),
    "logout.service": require('./logout.service'),
    "email.service": require('./email.service'),
    "signup.service": require('./signup.service'),
    "forgot-password.service": require('./forgotPassword.service'),
    "passport-login.service": require('./passportLogin.service'),
    "change-password.service": require('./changePassword.service'),
    "oidc.services": require('./oidc')
};