const passport = require('passport');
const GoogleStrategy = require("passport-google-oidc");
// want jwt startegy and basic username and password strategy
const {Strategy: JwtStrategy, ExtractJwt} = require('passport-jwt');
const LocalStrategy = require('passport-local').Strategy;
const config = require('./config');
const { getUserRepository, getIdentityProviderRepository } = require('#src/repositories/index.js');
const { generateUUID } = require('#src/utils/userIdGenerator.js');


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
                    // Here you can handle the user profile and perform any necessary actions
                    // For example, you can check if the user exists in your database and create a new user if not    
                    // please write the code for me copilot

                    const identityProviderRepository = getIdentityProviderRepository();

                    const existingUser = await identityProviderRepository.findByProviderIdentity('google', profile.id);

                    if (!existingUser) {
                        // Create a new user in users table and its corresponding record in identity_providers table in a single transaction
                        // Create an appliction specific unique user id for the user's table record and use it for the identity_providers table record
                    
                        const userRepository = getUserRepository();
                        const sequelize = config.runtime.db_connections.mysql;
                        const newUserId = generateUUID(); // Implement this function to generate a unique user ID
                        // create a transaction to insert into both users and identity_providers tables
                        const t = await sequelize.transaction();

                        try {
                            const newUser = await userRepository.create(
                                {
                                    id: newUserId,
                                    firstName: profile.name.givenName,
                                    lastName: profile.name.familyName,
                                    email: profile.emails[0].value,
                                },
                                { transaction: t }
                            );

                            await identityProviderRepository.create(
                                {
                                    userId: newUserId,
                                    provider: 'google',
                                    providerUserId: profile.id,
                                },
                                { transaction: t }
                            );

                            await t.commit();

                        } catch (error) {
                            await t.rollback();
                            throw error;
                        }

                    }            
                    
                    const user = {
                        id: profile.id,
                        displayName: profile.displayName,
                        emails: profile.emails,
                    };
                    
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
                algorithms: ["HS256"],
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