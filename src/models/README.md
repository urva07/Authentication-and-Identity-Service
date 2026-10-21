# MySQL models

MySQL entities use Sequelize and are initialized by `src/config/mysql.js`.
The model registry in `index.js` returns the `User`, `UserPassword`, and
`IdentityProvider` models and defines their associations.

- `User` stores optional email plus profile fields directly, including name,
  phone, date of birth, gender, profile photo, and profile completion status.
  Email and phone are unique login identifiers when present.
- `UserPassword` stores a password hash (never a plaintext password), one per
  user. Hash passwords in the authentication service before saving them.
- `IdentityProvider` maps to `user_idps` and links a user to an OAuth provider's
  stable subject/user ID. A user can have multiple providers, and the provider
  plus provider user ID must be unique.

Model initialization does not create or alter tables. Use migrations to apply
schema changes; the application intentionally does not call `sequelize.sync()`
on startup. Sequelize manages the `created_at` and `updated_at` fields for
`users` and `user_passwords`; `user_idps` has only `created_at`.
