const COALESCING = Object.freeze({
    DATABASES: Object.freeze({
        MYSQL: 'mysql',
        REDIS: 'redis',
        MONGODB: 'mongodb'
    }),
    REDIS_INSTANCES: Object.freeze({
        USER_CACHE: 'userCacheInstance',
        SESSION: 'sessionInstance',
        RATE_LIMIT: 'rateLimitInstance'
    }),
    MYSQL: Object.freeze({
        REPOSITORIES: Object.freeze({
            USER: 'userRepository',
            USER_PASSWORD: 'userPasswordRepository',
            IDENTITY_PROVIDER: 'identityProviderRepository',
            ACTIVE_TOKEN: 'activeTokenRepository'
        }),
        METHODS: Object.freeze({
            USER: Object.freeze({
                CREATE: 'create',
                FIND_BY_ID: 'findById',
                CREATE_BUT_IGNORE_IF_EXISTS: 'createButIgnoreIfExists',
                FIND_BY_EMAIL_OR_CREATE: 'findByEmailOrCreate',
                FIND_BY_EMAIL: 'findByEmail',
                FIND_BY_EMAIL_WITH_PASSWORD: 'findByEmailWithPassword',
                UPDATE_BY_ID: 'updateById',
                DELETE_BY_ID: 'deleteById',
                FIND_USER_WITH_IDENTITY_PROVIDER: 'findUserWithIdentityProvider'
            }),
            USER_PASSWORD: Object.freeze({
                CREATE: 'create',
                FIND_BY_USER_ID: 'findByUserId',
                UPDATE_BY_USER_ID: 'updateByUserId',
                DELETE_BY_USER_ID: 'deleteByUserId'
            }),
            IDENTITY_PROVIDER: Object.freeze({
                CREATE: 'create',
                FIND_BY_PROVIDER_IDENTITY: 'findByProviderIdentity',
                FIND_ALL_BY_USER_ID: 'findAllByUserId',
                DELETE_BY_PROVIDER_IDENTITY: 'deleteByProviderIdentity'
            }),
            ACTIVE_TOKEN: Object.freeze({
                CREATE: 'create',
                CONSUME: 'consume'
            })
        })
    }),
    REDIS: Object.freeze({
        USER_CACHE_INSTANCE: Object.freeze({
            REPOSITORIES: Object.freeze({
                PROFILE_CACHE: 'profileCacheRepository',
                USER_EXISTENCE: 'userExistenceRepository'
            }),
            METHODS: Object.freeze({
                PROFILE_CACHE: Object.freeze({
                    GET_BY_ID: 'getById',
                    SET_BY_ID: 'setById',
                    INVALIDATE_BY_ID: 'invalidateById'
                }),
                USER_EXISTENCE: Object.freeze({
                    GET_BY_ID: 'getById',
                    SET_BY_ID: 'setById',
                    DELETE_BY_ID: 'deleteById'
                })
            })
        }),
        SESSION_INSTANCE: Object.freeze({
            REPOSITORIES: Object.freeze({
                USER_LOCK: 'userLockRepository'
            }),
            METHODS: Object.freeze({
                USER_LOCK: Object.freeze({
                    ACQUIRE: 'acquire',
                    RELEASE: 'release',
                    IS_LOCKED: 'isLocked'
                })
            })
        }),
        RATE_LIMIT_INSTANCE: Object.freeze({
            REPOSITORIES: Object.freeze({}),
            METHODS: Object.freeze({})
        })
    })
});


module.exports = {
    COALESCING
};
