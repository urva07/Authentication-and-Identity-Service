const TOKEN_EXPIRY_SECONDS = 60 * 60;
const PASSWORD_RESET_PURPOSE = 'password-reset';

const AUTH_TOKENS = Object.freeze({
    ACCESS: 'access',
    REFRESH: 'refresh',
    PASSWORD_RESET: PASSWORD_RESET_PURPOSE
});

const AUTH_COOKIE_NAMES = Object.freeze({
    ACCESS: 'accessToken',
    REFRESH: 'refreshToken'
});

const JWT_CLAIMS = Object.freeze({
    SUBJECT: 'sub',
    PURPOSE: 'purpose'
});


module.exports = {
    AUTH_COOKIE_NAME: 'auth_token',
    REFRESH_TOKEN_COOKIE_NAME: AUTH_COOKIE_NAMES.REFRESH,
    TOKEN_EXPIRY_SECONDS,
    PASSWORD_RESET_PURPOSE,
    TOKEN_EXPIRY_MILLISECONDS: TOKEN_EXPIRY_SECONDS * 1000,
    AUTH_TOKENS,
    AUTH_COOKIE_NAMES,
    JWT_CLAIMS
};