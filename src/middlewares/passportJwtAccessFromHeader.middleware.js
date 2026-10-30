const passport = require('passport');

const passportJWTAccessFromHeader = (req, res, next) => {
    passport.authenticate('jwtAccessFromHeader', (error, user, info) => {
        if (error) return next(error);
        req.user = user;
        return next();
    })(req, res, next);
};

module.exports = passportJWTAccessFromHeader