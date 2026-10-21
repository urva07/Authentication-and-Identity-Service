# Repositories

Database access and persistence queries belong here. Repositories are called by
services and keep database-specific operations out of controllers.

`index.js` exports the repository factories individually. Services can import
only the repository they need and pass it the corresponding Sequelize model,
for example:

```js
const { userRepository } = require('../repositories');
const repository = userRepository(User);
```

At production startup, `configureRepositories(models)` initializes the shared
repository instances from the connected Sequelize models. Service factories
resolve those instances when their operations run, allowing routes to create
services before the database connection is established while preserving
dependency injection for tests.

Repositories expose create, lookup, update, and delete operations for their
respective tables. Update and delete methods return Sequelize's affected-row
count (for update, the first element of Sequelize's returned tuple).
