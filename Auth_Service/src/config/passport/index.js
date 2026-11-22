const passport = require('passport');
const config = require('../config');
const { basicStrategy } = require('./basic.js');
const { googleOidcStrategy } = require('./googleOidc.js');
const { jwtStrategy } = require('./jwt.js');
const { mysql: { getUserRepository } } = require('#src/repositories/index.js');
const requestCoalescer = require('#src/lib/requestCoalescer.js')
const { createCoalescingKey } = require('#src/lib/index.js');
const {
    PASSPORT_STRATEGIES,
    COALESCING
} = require('#src/constants/index.js');


const initializePassport = (session=true) => {
    if (session) {
        const coalescingKey = createCoalescingKey({
            db: COALESCING.DATABASES.MYSQL,
            repository: COALESCING.MYSQL.REPOSITORIES.USER,
            method: COALESCING.MYSQL.METHODS.USER.FIND_BY_ID
        });

        passport.serializeUser((user, done) => done(null, user.id));
        passport.deserializeUser(async (id, done) => {
            try {
                const args = [id];
                const user = await requestCoalescer(
                    coalescingKey(args),
                    () => getUserRepository().findById(...args)
                );
                done(null, user || false);
            } catch (error) {
                done(error);
            }
        });
    }

    passport.use(PASSPORT_STRATEGIES.BASIC, basicStrategy);
    passport.use(PASSPORT_STRATEGIES.GOOGLE, googleOidcStrategy);
    passport.use(PASSPORT_STRATEGIES.JWT_REFRESH_COOKIE, jwtStrategy(
        config.auth.jwt.jwtRefreshTokenSecret,
        'cookie',
        config.auth.jwt.cookieOptions.refresh.name
    ));
    passport.use(PASSPORT_STRATEGIES.JWT_ACCESS_HEADER, jwtStrategy(
        config.auth.jwt.jwtAccessTokenSecret,
        'header'
    ));
}


module.exports = {
    initializePassport
}