module.exports = {
    "abort-signal.middleware": require("./abort-signal.middleware"),
    "auth.middleware": require("./auth.middleware"),
    "notFound.middleware": require("./notFound.middleware"),
    "error.middleware": require("./error.middleware"),
    "notImplemented.middleware": require("./notImplemented.middleware"),
    "passportJWTRefreshFromCookie.middleware": require("./passportJwtRefreshFromCookie.middleware"),
    "passportJWTAccessFromHeader.middleware": require("./passportJwtAccessFromHeader.middleware"),
    cors: require('cors'),
    helmet: require('helmet'),
    pinoHttp: require('pino-http'),
    cookieParser: require('cookie-parser'),
    passport: require('passport'),
    session: require('express-session'),
    json: require('express').json,
    urlencoded: require('express').urlencoded,
    rateLimiter: require('express-rate-limit'),
    requestCounterMiddleware: require("./requestCounter.middleware")
}