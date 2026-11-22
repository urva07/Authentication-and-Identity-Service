# Repositories

Repositories contain database access. Services call them, which keeps queries
out of controllers and services. Import everything through the index:

```js
const {
    mysql: { getUserRepository, getActiveTokenRepository },
    redis: { userCacheInstance: { getprofileCacheRepository } }
} = require('#src/repositories/index.js');
```

## Layout

| Folder | Store | Contents |
| --- | --- | --- |
| `mysql/` | MySQL (Sequelize) | `user`, `userPassword`, `identityProvider` and `activeToken` repositories. See [mysql/README.md](./mysql/README.md). |
| `redis/userCacheInstance/` | Redis (user cache client) | `userCacheInstance` and `userLock` repositories. |

## Factories, configuration and getters

- Each repository file exports a factory that receives its dependencies, such
  as the Sequelize models and `createQueryLogger`, or the Redis client, and
  returns an object of methods. Tests can build a repository directly or inject
  a stub.
- `configureRepositories(...)` builds the shared instances. `server.js` calls
  `mysql.configureRepositories(mysql.models)` and
  `redis.userCacheInstance.configureRepositories(redis.redisCacheClient)` after the
  database connections are initialized.
- The `get<Name>Repository()` getters return those shared instances. They throw
  (`Repositories have not been configured`) if called before
  `configureRepositories`.
- Consumers must therefore call the getters when an operation runs, not while
  a service, middleware or Passport strategy factory is created. Routes build
  services when `app.js` loads, which is before the repositories exist.

## MySQL repositories

Methods return Sequelize results (promises). Every method takes a trailing
`options` object that is passed to Sequelize, so callers can supply a
`transaction`, `lock` and similar. Queries are benchmarked, and
`createQueryLogger(queryName, repositoryName)` records their duration (see
[monitoring](../monitoring/README.md)). Update and delete methods return
Sequelize's affected-row count; update returns it as the first element of the
result array.

| Repository | Methods |
| --- | --- |
| `userRepository` | `create`, `findById`, `findByEmail`, `findByEmailWithPassword`, `findByEmailOrCreate`, `updateById`, `deleteById` |
| `userPasswordRepository` | `create`, `findByUserId`, `updateByUserId`, `deleteByUserId` |
| `identityProviderRepository` | `create`, `findByProviderIdentity`, `findAllByUserId`, `deleteByProviderIdentity` |
| `activeTokenRepository` | `create`, `consume` |

`activeTokenRepository.consume({ tokenType, jti, userId })` deletes the
matching unexpired token and returns the number of rows removed, so a single-use
token can only be consumed once (`1` on success, `0` otherwise). Run it inside
the same transaction as the change it authorizes.

## Redis repositories

Both take the Redis client created for the user cache.

- `profileCacheRepository`: `getById(userId)` returns the parsed cached user or
  `null`; `setById(userId, user, ttl = 300)` stores it as JSON under
  `user:<id>` with an expiry in seconds; `invalidateById(userId)` removes it.
- `userLockRepository`: `acquire(userId, token, ttl = 3600)` sets
  `lock:user:<id>` only if it does not exist (expiry in milliseconds);
  `release(userId, token)` deletes it only if the stored token matches, using
  an atomic script; `isLocked(userId)` reports whether the lock exists. The
  profile service skips writing to the cache while a user is locked. Nothing in
  the application acquires the lock yet.

Redis getters throw `Redis repositories have not been configured` before
configuration, and `configureRepositories` throws a `TypeError` without a
client.

## Adding a repository

1. Add `<name>.repository.js` exporting a factory with the dependencies it needs.
2. Register it in the folder's `configureRepositories` and export a
   `get<Name>Repository` getter from the folder's `index.js`.
3. Use the getter lazily inside the service method that needs it.
