const GoogleStrategy = require("passport-google-oidc");
const config = require('../config');
const { 
    mysql: { 
        getUserRepository, 
        getIdentityProviderRepository 
    } 
} = require('#src/repositories/index.js');
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
const { createCoalescingKey } = require('#src/lib/index.js');


const createGoogleOidcAuthenticationCallback = ({
    userRepository,
    identityProviderRepository,
    mysqlSequelizeClient = sequelize
} = {}) => {
    
    const identityProviderRepositoryCoalescingKey = createCoalescingKey({
        db: "mysql",
        repository: "identityProviderRepository",
        method: "findByProviderIdentity"
    });

    const userRepositoryFindByIdCoalescingKey = createCoalescingKey({
        db: "mysql",
        repository: "userRepository",
        method: "findById"
    });

    return async (issuer, profile, done) => {
        try {
            userRepository = userRepository || getUserRepository();
            identityProviderRepository = identityProviderRepository || getIdentityProviderRepository();

            const args = ['google', profile.id];
            const existingUser = await requestCoalescer(
                identityProviderRepositoryCoalescingKey(args),
                () => identityProviderRepository.findByProviderIdentity(...args),
                logger
            );
            logger.debug(`[Google OIDC] Existing identity ${existingUser ? 'found' : 'not found in identityProviderRepository'}.`);

            if (existingUser) {
                const args = [
                    existingUser.userId,
                    { 
                        attributes: ['id', 'email', 'firstName', 'lastName'],
                    }
                ];
                const user = await requestCoalescer(
                    userRepositoryFindByIdCoalescingKey(args),
                    () => userRepository.findById(...args),
                    logger
                );

                logger.debug('[Google OIDC] Reusing existing user.');
                return done(null, user);
            }

            let user = {
                id: generateUUID(),
                firstName: profile.name.givenName,
                lastName: profile.name.familyName,
                email: profile.emails[0].value,
            }
                
            const t = await mysqlSequelizeClient.transaction();

            try {
                logger.debug('[Google OIDC] Started transaction to create user and identity.');

                await userRepository.createButIgnoreIfExists(
                    user,
                    { 
                        transaction: t 
                    }
                );

                user = await userRepository.findByEmail(
                    user.email, 
                    { 
                        attributes: ['id', 'email', 'firstName', 'lastName'],
                        transaction: t
                    }
                );

                if (!user) {
                    throw new Error('[Google OIDC] Failed to find user after creation in userRepository.');
                }

                let identityAlreadyExists = false;
                try {
                    await identityProviderRepository.create(
                        {
                            userId: user.id,
                            provider: 'google',
                            providerUserId: profile.id,
                        },
                        { 
                            transaction: t 
                        }
                    );
                } catch (error) {
                    if (
                        error.name === 'SequelizeUniqueConstraintError' ||
                        error.code === 'ER_DUP_ENTRY' ||
                        error.parent?.code === 'ER_DUP_ENTRY'
                    ) {
                        identityAlreadyExists = true;
                    } else {
                        throw error;
                    }
                }

                if (identityAlreadyExists) {
                    await t.rollback();
                    logger.debug('[Google OIDC] Identity already exists in the identityProviderRepository; reusing the existing user.');
                    return done(null, user);
                }

                await t.commit();
                logger.debug('[Google OIDC] User and identity created; transaction committed.');
            } catch (error) {
                await t.rollback();
                logger.debug('[Google OIDC] User or identity creation failed; transaction rolled back.');
                return done(error);
            }
        } catch (error) {
            logger.debug('[Google OIDC] Authentication callback failed.');
            return done(error);
        }
    }
}

const googleOidcStrategy = new GoogleStrategy(
    {
        clientID: config.auth.oidc.google.clientId,
        clientSecret: config.auth.oidc.google.clientSecret,
        callbackURL: config.auth.oidc.google.callbackUrl,
        scope: (config.auth.oidc.google.scope || "openid email profile").split(" "),
    }, 
    createGoogleOidcAuthenticationCallback()
);


module.exports = {
    googleOidcStrategy,
    createGoogleOidcAuthenticationCallback
}