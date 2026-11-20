const PASSPORT_STRATEGIES = Object.freeze({
    BASIC: 'basic',
    GOOGLE: 'google',
    JWT_ACCESS_HEADER: 'jwtAccessFromHeader',
    JWT_REFRESH_COOKIE: 'jwtRefreshFromCookie'
});

module.exports = {
    PASSPORT_STRATEGIES
};
