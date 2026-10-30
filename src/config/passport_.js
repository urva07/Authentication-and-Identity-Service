// const passport = require('passport');
// const GoogleStrategy = require("passport-google-oidc");
// const {Strategy: JwtStrategy, ExtractJwt} = require('passport-jwt');
// const LocalStrategy = require('passport-local').Strategy;
// const config = require('./config');
// const { getUserRepository, getIdentityProviderRepository } = require('#src/repositories/index.js');
// const { generateUUID } = require('#src/utils/userIdGenerator.js');
// const { verifyPassword } = require('#src/utils/hashPasswordAndVerify.js');
// const { AuthenticationError } = require('#src/errors/index.js');


// const initializePassport = () => {

//     passport.serializeUser((user, done) => done(null, user.id));
//     passport.deserializeUser(async (id, done) => {
//         try {
//             const user = await getUserRepository().findById(id);
//             done(null, user || false);
//         } catch (error) {
//             done(error);
//         }
//     });

//     passport.use(
//         'google',
//         new GoogleStrategy(
//             {
//                 clientID: config.auth.oidc.google.clientId,
//                 clientSecret: config.auth.oidc.google.clientSecret,
//                 callbackURL: config.auth.oidc.google.callbackUrl,
//                 scope: (config.auth.oidc.google.scope || "openid email profile").split(" "),
//             }, 
//             async (issuer, profile, done) => {
//                 try {
//                     const identityProviderRepository = getIdentityProviderRepository();
//                     const existingUser = await identityProviderRepository.findByProviderIdentity('google', profile.id);

//                     const user = {
//                         id: existingUser ? existingUser.userId : generateUUID(),
//                         firstName: profile.name.givenName,
//                         lastName: profile.name.familyName,
//                         email: profile.emails[0].value,
//                     }

//                     if (!existingUser) {
//                         const userRepository = getUserRepository();

//                         const sequelize = config.runtime.db_connections.mysql;
//                         const t = await sequelize.transaction();

//                         try {
//                             await userRepository.create(
//                                 user,
//                                 { transaction: t }
//                             );

//                             await identityProviderRepository.create(
//                                 {
//                                     userId: user.id,
//                                     provider: 'google',
//                                     providerUserId: profile.id,
//                                 },
//                                 { transaction: t }
//                             );

//                             await t.commit();
//                         } catch (error) {
//                             await t.rollback();
//                             return done(error);
//                         }
//                     }            
                    
//                     return done(null, user);
//                 } catch (error) {
//                     return done(error);
//                 }
//             }
//         )
//     );

//     passport.use(
//         'jwtRefresh',
//         new JwtStrategy(
//             {
//                 jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
//                 secretOrKey: config.auth.jwt.jwtRefreshTokenSecret,
//                 algorithms: [config.auth.jwt.jwtAlgorithm],
//             }, 
//             async (payload, done) => {
//                 try {
//                     const userId = payload.sub;
//                     const userRepository = getUserRepository();
//                     const user = await userRepository.findById(userId);

//                     if (!user) {
//                         return done(null, false);
//                     }

//                     return done(null, user);
//                 } catch (error) {
//                     return done(error, false);
//                 }
//             }
//         )
//     );

//     passport.use(
//         'jwtAccess',
//         new JwtStrategy(
//             {
//                 jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
//                 secretOrKey: config.auth.jwt.jwtAccessTokenSecret,
//                 algorithms: [config.auth.jwt.jwtAlgorithm],
//             }, 
//             async (payload, done) => {
//                 try {
//                     // payload.sub contains the user ID
                
//                     const userId = payload.sub;
//                     const userRepository = getUserRepository();
//                     const user = await userRepository.findById(userId);

//                     if (!user) {
//                         return done(null, false);
//                     }

//                     return done(null, user);
                
//                 } catch (error) {
//                     return done(error, false);
//                 }
//             }
//         )
//     );

//     passport.use(
//         'basic',
//         new LocalStrategy(
//             {
//                 usernameField: 'email',
//                 passwordField: 'password'
//             }, 
//             async (email, password, done) => {
//                 try {
//                     const userRepository = getUserRepository();
//                     const user = await userRepository.findByEmailWithPassword(email);

//                     if (!user) {
//                         return done(new AuthenticationError('User not found'));
//                     }

//                     const hashedPassword = user.password?.passwordHash ?? user.password;
//                     if (!hashedPassword) {
//                         return done(new AuthenticationError('Invalid Username or Password'));
//                     }

//                     const isPasswordValid = await verifyPassword(password, hashedPassword);
//                     if (!isPasswordValid) {
//                         return done(new AuthenticationError('Invalid Username or Password'));
//                     }

//                     return done(null, user);
//                 } catch (error) {
//                     return done(error);
//                 }

//             }
//         )
//     );

// }

// module.exports = initializePassport;