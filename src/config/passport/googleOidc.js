const GoogleStrategy = require("passport-google-oidc");
const config = require('../config');
const { mysql: { getUserRepository, getIdentityProviderRepository } } = require('#src/repositories/index.js');
const { generateUUID } = require('#src/utils/userIdGenerator.js');
const logger = require('#src/utils/logger.js');
const { 
    dbs: { 
        mysql: { 
            sequelize 
        } 
    } 
} = require('#src/infrastructure/database/index.js');
const requestCoalescer = require('#src/lib/requestCoalescer.js')
const createCoalescingKey = require('#src/lib/createCoalescingKey.js');


const googleOidcStrategy = new GoogleStrategy(
    {
        clientID: config.auth.oidc.google.clientId,
        clientSecret: config.auth.oidc.google.clientSecret,
        callbackURL: config.auth.oidc.google.callbackUrl,
        scope: (config.auth.oidc.google.scope || "openid email profile").split(" "),
    }, 
    async (issuer, profile, done) => {
        logger.debug('[Google OIDC] Authentication callback received.');
        try {
            const identityProviderRepository = getIdentityProviderRepository();
            const existingUser = await requestCoalescer(
                createCoalescingKey({
                    db: "mysql",
                    repository: "identityProviderRepository",
                    method: "findByProviderIdentity",
                    args: ['google', profile.id]
                }),
                () => identityProviderRepository.findByProviderIdentity('google', profile.id),
                logger
            );
            logger.debug(`[Google OIDC] Existing identity ${existingUser ? 'found' : 'not found'}.`);

            const user = {
                id: existingUser ? existingUser.userId : generateUUID(),
                firstName: profile.name.givenName,
                lastName: profile.name.familyName,
                email: profile.emails[0].value,
            }

            if (!existingUser) {
                const userRepository = getUserRepository();

                const t = await sequelize.transaction();
                logger.debug('[Google OIDC] Started transaction to create user and identity.');

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
                    logger.debug('[Google OIDC] User and identity created; transaction committed.');
                } catch (error) {
                    await t.rollback();
                    logger.debug('[Google OIDC] User or identity creation failed; transaction rolled back.');
                    return done(error);
                }
            } else {
                logger.debug('[Google OIDC] Reusing existing user.');
            }
            
            return done(null, user);
        } catch (error) {
            logger.debug('[Google OIDC] Authentication callback failed.');
            return done(error);
        }
    }
);


module.exports = {
    googleOidcStrategy
}