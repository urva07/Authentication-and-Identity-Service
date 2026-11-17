# Tests

Automated tests use [Jest](https://jestjs.io) and
[supertest](https://github.com/ladjs/supertest). Load tests use
[k6](https://k6.io).

## Running

```bash
npm test                              # all Jest tests
npm run test:watch                    # re-run on change
npm run test:coverage                 # coverage report in coverage/
npx jest tests/unit/services          # a folder
npx jest tests/unit/services/signin-service.test.js -t "conflict"
```

`jest.config.js` runs every `tests/**/*.test.js` file in the Node environment,
loads `tests/setup.js` before each test file (test-only configuration defaults) and
collects coverage from `src/**/*.js`, excluding `index.js` files.

Test setup supplies local placeholder configuration when required settings are
unset. Tests use stubs and do not require a running database, Redis or mail
server. Existing environment values take precedence over the placeholders.

## Layout

```
tests/
├── setup.js          # global Jest setup
├── unit/             # one folder per src/ folder
├── integration/      # HTTP tests with supertest
├── fixtures/         # shared test data (empty)
└── load/             # k6 load test
```

### Unit tests (`unit/`)

The folders mirror `src/`: `config`, `controllers`, `errors`, `lib`,
`middlewares`, `migrations`, `models`, `repositories`, `services` and
`validators`. Files are named in kebab-case after the unit under test, for
example `signin-service.test.js` or `error-middleware.test.js`.

- **Services, controllers, middleware:** build the unit through its factory and
  inject stubs, for example
  `createSigninService({ userRepository, emailService })`. This is the
  dependency injection described in the [services](../src/services/README.md)
  and [controllers](../src/controllers/README.md) READMEs.
- **Repositories:** pass fake Sequelize models with `jest.fn()` methods and
  assert the query options (`where`, `transaction`).
- **Models and migrations:** define the model on an unconnected `Sequelize`
  instance and check table names, columns and keys against the migration.
- **Validators:** call the middleware with a fake `req` and a `next` mock, then
  check `next` received a `ValidationError` or that `req.body` was normalized.
- **Configuration:** tests that change `config` values restore the originals in
  `afterAll`.

### Integration tests (`integration/`)

Use supertest against the real Express apps (`src/app.js` and
`src/healthApp.js`) without opening a port. External layers are mocked with
`jest.mock`: the auth and OIDC route tests replace the services registry, so the
tests cover routing, validators, middleware, controllers and response shaping
rather than business logic. Covers:

- `auth-routes`: the `/v1/auth` routes.
- `google-oidc-routes`: the OIDC routes.
- `profile-routes`: the `/v1/profile` routes.
- `health-app`, `health-routes`, `health`: the health application.

### Load tests (`load/`)

`route.js` is a k6 script that hits one route with constant virtual users.
Settings come from environment variables; copy `.env.example` to `.env` (which
is git-ignored) and run:

```bash
(
  set -a
  source ./tests/load/.env && k6 run tests/load/route.js
)
```

| Variable | Meaning |
| --- | --- |
| `K6_BASE_URL` | Server origin, default `http://127.0.0.1:3000`. |
| `K6_PATH`, `K6_METHOD` | Route and HTTP method to test. |
| `K6_EXPECTED_STATUS` | Status the check expects, default `200`. |
| `K6_VUS`, `K6_DURATION` | Virtual users (1 to 20) and duration (up to 10 minutes, `30s` or `5m`). |
| `K6_PAYLOAD` | JSON body; overrides the per-route payload below. |
| `K6_METHOD_<METHOD>_PATH_<path>_PAYLOAD` | JSON body for a route, where non-alphanumeric characters of the path become `_`, for example `K6_METHOD_POST_PATH__v1_auth_login_PAYLOAD`. |

The test fails if fewer than 99% of checks pass or the 95th percentile request
duration exceeds one second. Run it only against a local or test environment,
and note that routes needing credentials or tokens (such as `/v1/auth/refresh`)
need real values in the payload or cookies for the expected status.

## Writing tests

- Put a unit test in the folder that mirrors the source file, named
  `<unit>.test.js`.
- Import Jest APIs explicitly (`const { describe, test, expect, jest } =
  require('@jest/globals')`), as the existing tests do.
- Prefer injecting stubs through factories over mocking modules; use
  `jest.mock` for module-level dependencies such as the services registry.
- Keep tests independent: create stubs in `beforeEach` and restore any mutated
  shared state, such as `config` values, afterwards.
- Cover the failure paths (invalid input, missing user, expired token) as well
  as the success path.
