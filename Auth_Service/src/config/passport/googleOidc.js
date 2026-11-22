const GoogleStrategy = require("passport-google-oidc");
const config = require('../config');
const { 
    mysql: { 
        getUserRepository, 
        getIdentityProviderRepository 
    }
} = require('#src/repositories/index.js');
const { generateUUID } = require('#src/utils/userIdGenerator.js');
const defaultLogger = require('#src/utils/logger.js');
const { 
    dbs: { 
        mysql: { 
            sequelize 
        }
    } 
} = require('#src/infrastructure/database/index.js');
const requestCoalescer = require('#src/lib/requestCoalescer.js')
const { createCoalescingKey } = require('#src/lib/index.js');
const { IDENTITY_PROVIDERS, COALESCING } = require('#src/constants/index.js');


const createGoogleOidcAuthenticationCallback = ({
    userRepository,
    identityProviderRepository,
    mysqlSequelizeClient = sequelize
} = {}) => {
    
    const identityProviderRepositoryCoalescingKey = createCoalescingKey({
        db: COALESCING.DATABASES.MYSQL,
        repository: COALESCING.MYSQL.REPOSITORIES.IDENTITY_PROVIDER,
        method: COALESCING.MYSQL.METHODS.IDENTITY_PROVIDER.FIND_BY_PROVIDER_IDENTITY
    });

    return async (req, issuer, profile, done) => {
        const logger = req.log || defaultLogger;
        try {
            userRepository = userRepository || getUserRepository();
            identityProviderRepository = identityProviderRepository || getIdentityProviderRepository();

            const args = [IDENTITY_PROVIDERS.GOOGLE, profile.id];
            const existingUser = await requestCoalescer(
                identityProviderRepositoryCoalescingKey(args),
                () => userRepository.findUserWithIdentityProvider(...args),
                logger
            );
            logger.debug(`[Google OIDC] Existing identity ${existingUser ? 'found' : 'not found in identityProviderRepository'}.`);

            if (existingUser) {
                logger.debug('[Google OIDC] Reusing existing user.');
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
                            provider: IDENTITY_PROVIDERS.GOOGLE,
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
                logger.debug({ userId: user.id }, '[Google OIDC] User and identity created; transaction committed.');
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
        passReqToCallback: true,
        scope: (config.auth.oidc.google.scope || "openid email profile").split(" "),
    }, 
    createGoogleOidcAuthenticationCallback()
);


module.exports = {
    googleOidcStrategy,
    createGoogleOidcAuthenticationCallback
}