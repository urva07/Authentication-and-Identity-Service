const passport = require('passport');

const passportJWTRefreshFromCookie = (req, res, next) => {
    passport.authenticate('jwtRefreshFromCookie', (error, user, info) => {
        if (error) return next(error);
        req.user = user;
        return next();
    })(req, res, next);
};

module.exports = passportJWTRefreshFromCookie;