# MySQL models

Sequelize models for the MySQL database. Each file defines one model with a
`define<Name>(sequelize)` function, and `index.js` exports
`initializeModels(sequelize)`, which defines all models, sets up their
associations and returns them:

```js
const { User, UserPassword, IdentityProvider, ActiveToken } = initializeModels(sequelize);
```

`src/infrastructure/database/mysql.js` calls it once with the shared Sequelize
instance and exposes the result as `mysql.models`. `server.js` passes these
models to `configureRepositories` in `src/repositories/mysql`, so application
code uses repositories rather than models directly.

Attributes are camelCase in JavaScript and snake_case in the database
(`underscored: true`).

## Models

| Model | Table | Primary key | Timestamps |
| --- | --- | --- | --- |
| `User` | `users` | `id` (UUID, defaults to UUIDv4) | `created_at`, `updated_at` |
| `UserPassword` | `user_passwords` | `id` (auto-increment BIGINT) | `created_at`, `updated_at` |
| `IdentityProvider` | `user_idps` | `id` (auto-increment BIGINT) | `created_at` only |
| `ActiveToken` | `active_tokens` | composite `token_type` + `jti` | `created_at` only |

- `User` stores the email and profile fields directly: `email`, `firstName`,
  `lastName`, `phone`, `dateOfBirth`, `gender`, `profilePhoto` and
  `profileCompleted` (defaults to `false`). Everything except
  `profileCompleted` is optional. `email` (validated as an email address) and
  `phone` are unique login identifiers when present.
- `UserPassword` stores a `passwordHash`, never a plaintext password, with one
  row per user (`userId` is unique). Hash passwords in the service layer before
  saving them.
- `IdentityProvider` links a user to an external identity provider (for example
  Google) through `provider` and the provider's stable `providerUserId`. A user
  can have several providers, and the `provider` + `providerUserId` pair is
  unique (`unique_idp`).
- `ActiveToken` records issued single-use tokens, such as password-reset
  tokens, by `tokenType` and `jti`, with an `expiresAt` and an optional
  `userId`. A token is valid only while its row exists and has not expired, and
  the row is deleted when the token is consumed.

## Associations

- `User` has one `UserPassword` (`as: 'password'`); `UserPassword` belongs to
  `User` (`as: 'user'`).
- `User` has many `IdentityProvider` (`as: 'identityProviders'`);
  `IdentityProvider` belongs to `User` (`as: 'user'`).
- `ActiveToken` has no Sequelize association. Its `user_id` foreign key exists
  only in the migration.

Foreign keys use `ON DELETE CASCADE`, so deleting a user removes its password,
identity provider and active token rows.

## Schema changes

Models describe the tables but do not create or alter them. Apply schema
changes with the migrations in `migrations/`; the application intentionally
does not call `sequelize.sync()` on startup. When you change a model, add a
matching migration. Sequelize only fills `created_at` and `updated_at` for the
tables that have them, as listed above.
