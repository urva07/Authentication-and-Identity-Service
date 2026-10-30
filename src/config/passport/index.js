const passport = require('passport');
const config = require('../config');
const { basicStrategy } = require('./basic.js');
const { googleOidcStrategy } = require('./googleOidc.js');
const { jwtStrategy } = require('./jwt.js');
const { getUserRepository } = require('#src/repositories/index.js');

const initializePassport = (session=true) => {
    if (session) {
        passport.serializeUser((user, done) => done(null, user.id));

        passport.deserializeUser(async (id, done) => {
            try {
                const user = await getUserRepository().findById(id);
                done(null, user || false);
            } catch (error) {
                done(error);
            }
        });
    }

    passport.use('basic', basicStrategy);
    passport.use('google', googleOidcStrategy);
    passport.use('jwtRefreshFromCookie', jwtStrategy(
        config.auth.jwt.jwtRefreshTokenSecret,
        'cookie',
        config.auth.jwt.jwtRefreshTokenCookieName
    ));
    passport.use('jwtAccessFromHeader', jwtStrategy(
        config.auth.jwt.jwtAccessTokenSecret,
        'header'
    ));
}

module.exports = {
    initializePassport
}