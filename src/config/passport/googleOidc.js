const GoogleStrategy = require("passport-google-oidc");
const config = require('../config');
const { 
    mysql: { 
        getUserRepository, 
        getIdentityProviderRepository 
    },
    redis: {
        userCacheInstance: {
            getUserExistenceRepository
        },
        sessionInstance: {
            getUserLockRepository
        }
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
const { createCoalescingKey, cacheAuthenticatedUser } = require('#src/lib/index.js');


const createGoogleOidcAuthenticationCallback = ({
    userRepository,
    identityProviderRepository,
    userExistenceRepository,
    userLockRepository,
    mysqlSequelizeClient = sequelize
} = {}) => {
    
    const identityProviderRepositoryCoalescingKey = createCoalescingKey({
        db: "mysql",
        repository: "identityProviderRepository",
        method: "findByProviderIdentity"
    });

    return async (issuer, profile, done) => {
        try {
            userRepository = userRepository || getUserRepository();
            identityProviderRepository = identityProviderRepository || getIdentityProviderRepository();
            userExistenceRepository = userExistenceRepository || getUserExistenceRepository();
            userLockRepository = userLockRepository || getUserLockRepository();

            const args = ['google', profile.id];
            const existingUser = await requestCoalescer(
                identityProviderRepositoryCoalescingKey(args),
                () => userRepository.findUserWithIdentityProvider(...args),
                logger
            );
            logger.debug(`[Google OIDC] Existing identity ${existingUser ? 'found' : 'not found in identityProviderRepository'}.`);

            if (existingUser) {
                logger.debug('[Google OIDC] Reusing existing user.');

                await cacheAuthenticatedUser(
                    {
                        userExistenceRepository,
                        userLockRepository
                    },
                    existingUser.id,
                    logger
                );

                return done(
                    null, 
                    { 
                        id: existingUser.id, 
                        email: existingUser.email, 
                        firstName: existingUser.firstName, 
                        lastName: existingUser.lastName 
                    }
                );
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

                    await cacheAuthenticatedUser(
                        {
                            userExistenceRepository,
                            userLockRepository
                        },
                        user.id,
                        logger
                    );

                    return done(null, user);
                }

                await t.commit();
                logger.debug({ userId: user.id }, '[Google OIDC] User and identity created; transaction committed.');

                await cacheAuthenticatedUser(
                    {
                        userExistenceRepository,
                        userLockRepository
                    },
                    user.id,
                    logger
                );

                return done(null, user);
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