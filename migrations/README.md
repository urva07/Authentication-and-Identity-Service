# Migrations

Sequelize CLI migration files belong here. The CLI uses
`src/config/sequelize-cli.js` for database configuration and `.sequelizerc`
for project paths.

Generate a new migration with:

```sh
npm run db:migration:create -- add-example-table
```

Apply and roll back Sequelize migrations with `npm run db:migrate` and
`npm run db:migrate:undo`.

`20261009154500-create-auth-tables.js` creates the tables defined by the
Sequelize models: `users`, `user_passwords`, and `user_idps`. On a clean
database, run this migration before starting the service.

`20261108144900-create-active-tokens-table.js` adds `active_tokens`, an
allowlist of token type and JWT ID pairs with an expiry and an optional user
reference. User-bound tokens are deleted when their user is deleted; the
expiry index supports cleanup. Password-reset token issuance and single-use
consumption use this table; expired-token cleanup is not yet implemented.

`20261117053000-change-idp-provider-to-enum.js` changes `user_idps.provider`
from `VARCHAR(50)` to `ENUM('google')` to match the model. Run it only after
confirming every existing `provider` value is `google`; MySQL rejects the
change otherwise. The unique `unique_idp` index is preserved.
