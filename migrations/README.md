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
