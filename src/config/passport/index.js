const passport = require('passport');
const config = require('../config');
const { basicStrategy } = require('./basic.js');
const { googleOidcStrategy } = require('./googleOidc.js');
const { jwtStrategy } = require('./jwt.js');
const { mysql: { getUserRepository } } = require('#src/repositories/index.js');
const requestCoalescer = require('#src/lib/requestCoalescer.js')
const createCoalescingKey = require('#src/lib/createCoalescingKey.js');


const initializePassport = (session=true) => {
    if (session) {
        passport.serializeUser((user, done) => done(null, user.id));

        passport.deserializeUser(async (id, done) => {
            try {
                const user = await requestCoalescer(
                    createCoalescingKey({
                        db: "mysql",
                        repository: "userRepository",
                        method: "findById",
                        args: [id]
                    }),
                    () => getUserRepository().findById(id)
                );
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
        config.auth.jwt.cookieOptions.refresh.name
    ));
    passport.use('jwtAccessFromHeader', jwtStrategy(
        config.auth.jwt.jwtAccessTokenSecret,
        'header'
    ));
}


module.exports = {
    initializePassport
}