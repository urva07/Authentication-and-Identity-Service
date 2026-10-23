const passport = require('passport');
const GoogleStrategy = require("passport-google-oidc");
const {Strategy: JwtStrategy, ExtractJwt} = require('passport-jwt');
const LocalStrategy = require('passport-local').Strategy;
const config = require('./config');
const { getUserRepository, getIdentityProviderRepository } = require('#src/repositories/index.js');
const { generateUUID } = require('#src/utils/userIdGenerator.js');
const { generateJWTtoken } = require('#src/utils/jwt.js');


const initializePassport = () => {

    passport.use(
        'google',
        new GoogleStrategy(
            {
                clientID: config.oidc.google.clientId,
                clientSecret: config.oidc.google.clientSecret,
                callbackURL: config.oidc.google.callbackUrl,
                scope: (config.oidc.google.scope || "openid email profile").split(" "),
            }, 
            async (issuer, profile, done) => {
                try {
                    const identityProviderRepository = getIdentityProviderRepository();
                    const existingUser = await identityProviderRepository.findByProviderIdentity('google', profile.id);

                    const user = {
                        id: existingUser ? existingUser.userId : generateUUID(),
                        firstName: profile.name.givenName,
                        lastName: profile.name.familyName,
                        email: profile.emails[0].value,
                    }

                    if (!existingUser) {
                        const userRepository = getUserRepository();

                        const sequelize = config.runtime.db_connections.mysql;
                        const t = await sequelize.transaction();

                        try {
                            await userRepository.create(
                                user,
                                { transaction: t }
                            );

                            await identityProviderRepository.create(
                                {
                                    userId: user.id,
                                    provider: 'google',
                                    providerUserId: profile.id,
                                },
                                { transaction: t }
                            );

                            await t.commit();
                        } catch (error) {
                            await t.rollback();
                            return done(error);
                        }
                    }            
                    
                    return done(null, user);
                } catch (error) {
                    return done(error);
                }
            }
        )
    );

    passport.use(
        'jwt',
        new JwtStrategy(
            {
                jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
                secretOrKey: config.auth.jwtSecret,
                algorithms: [config.auth.jwtAlgorithm],
            }, 
            async (payload, done) => {
                try {
                    // payload.sub contains the user ID
                
                    const userId = payload.sub;
                    const userRepository = getUserRepository();
                    const user = await userRepository.findById(userId);

                    if (!user) {
                        return done(null, false);
                    }

                    return done(null, user);
                
                } catch (error) {
                    return done(error, false);
                }
            }
        )
    );

    passport.use(
        'basic',
        new LocalStrategy(
            {
                usernameField: 'email'
            }, 
            async (email, password, done) => {
                // Implementation for basic username and password strategy
            }
        )
    );

}

module.exports = initializePassport;