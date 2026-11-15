# Authentication and identity service

An Express.js based authentication and identity service providing email/password sign-in, email
verification, JWT access tokens via the `Authorization` header and refresh tokens via an
`HttpOnly` cookie, password reset, and Google OIDC.

## Features

- Email/password login using a Passport `basic` (local) strategy
- Sign-up (`signin`) with an emailed verification link
- JWT access tokens (read from the `Authorization` header) and refresh tokens
  (read from an `HttpOnly` cookie), validated with Passport JWT strategies
- Forgot-password flow with signed, short-lived reset links
- Google OIDC login
- Redis-backed sessions and a separate Redis instance for the user cache
- Request validation with Zod, security headers (Helmet), CORS, and rate limiting
- Structured request logging with Pino; request-scoped loggers (`req.log`)
- Prometheus metrics and a separate health application

## Tech Stack

Node.js (CommonJS), Express, Sequelize + MySQL, Mongoose + MongoDB, Redis,
Passport, Zod, Pino, Jest + Supertest, Docker Compose.

## Prerequisites

- Node.js 22 or later and npm
- MySQL, MongoDB, and Redis (local installs) **or** Docker with Docker Compose

## Getting Started

### Run locally

```sh
npm ci
cp .env.example .env      # then fill in the values (see Environment Variables)
npm run db:migrate
npm run db:seed           # optional: development user, see seeds/README.md
npm run dev               # nodemon; use `npm start` for a plain run
```

`npm run startwithdb` starts the Homebrew `mysql` and `redis` services, starts
`mongod` with `$(brew --prefix)/etc/mongod.conf` if nothing is listening on
port `27017`, then starts the app.

### Run with Docker Compose

```sh
cp -n .env.example .env
docker compose up --build -d
docker compose exec app npm run db:migrate
```

Compose starts the app, MySQL, and three Redis instances (`redis_session`,
`redis_user_cache`, and `redis_rate_limiter`). Each Redis service loads its
configuration from the corresponding read-only file in `redis/`; data persists
in named volumes. The API listens on port `3000` and the health app on `3001`.

Useful commands: `docker compose ps`, `docker compose logs -f app`,
`docker compose down` (add `-v` to also delete the volumes). If you add a
dependency and the container still cannot find it, the `node_modules` volume may
be stale. Run `docker compose run --rm --no-deps app npm ci`, then
`docker compose up --build --force-recreate`.

### Docker Compose npm scripts

The `compose*` scripts in `package.json` are shortcuts for common
`docker compose` commands. Run them from the project root with `npm run <script>`.

| Script | Runs | When to use it |
|--------|------|----------------|
| `compose` | `docker compose up` | Start the stack in the foreground with logs in your terminal (Ctrl+C stops it). |
| `compose:d` | `docker compose up -d` | Start the stack in the background (detached). |
| `compose:build` | `docker compose up --build` | Rebuild the app image, then start in the foreground. Use after changing `Dockerfile` or dependencies. |
| `compose:build:d` | `docker compose up -d --build` | Rebuild the image and start in the background. |
| `compose:stop` | `docker compose stop` | Stop the containers but keep them, along with their networks and volumes. |
| `compose:restart` | `docker compose restart` | Restart the running containers without rebuilding. |
| `compose:down` | `docker compose down` | Stop and remove the containers and network. Named volumes (database data) are kept. |
| `compose:down:v` | `docker compose down -v` | Same as `compose:down`, and also deletes the volumes. **This erases MySQL and Redis data.** |

Typical workflows:

```sh
npm run compose:build:d        # first run, or after changing dependencies
docker compose logs -f app     # follow the app logs
npm run compose:restart        # pick up .env changes
npm run compose:down           # shut everything down, keep data
npm run compose:down:v         # reset to a clean slate (deletes data)
```

Notes:

- Source files are bind-mounted into the app container and the app runs under
  nodemon, so code changes reload without a rebuild. Rebuild (`compose:build*`)
  only when `package.json`, `package-lock.json`, or the `Dockerfile` change.
- Extra flags can be passed after `--`, for example
  `npm run compose:build -- --force-recreate`.
- To run a one-off command in the app container, use
  `docker compose exec app <command>`, for example
  `docker compose exec app npm run db:migrate`.

## Environment Variables

All variables are listed in `.env.example`; the full set read by the code is in
`src/config`. The most important ones:

| Group | Variables | Notes |
|-------|-----------|-------|
| Application | `NODE_ENV`, `PORT`, `HEALTH_APP_PORT`, `API_BASE_URL`, `FRONTEND_BASE_URL`, `CORS_ORIGIN` | `API_BASE_URL` is used for email verification links (default `http://localhost:3000`). Set `CORS_ORIGIN` to the exact frontend origin for credentialed requests. |
| Timeouts | `EXTERNAL_API_TIMEOUT_MS` | Deadline for cancellable downstream calls (default `10000`). Exposed as `req.abortSignal`. |
| MySQL | `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_ROOT_PASSWORD` | Primary user store (Sequelize). |
| MongoDB | `MONGO_USERNAME`, `MONGO_PASSWORD`, `MONGO_HOST`, `MONGO_PORT`, `MONGO_DB_NAME`, `MONGO_AUTH_SOURCE` | Name and credentials are passed to Mongoose as options. |
| Redis (sessions) | `SESSION_REDIS_HOST`, `SESSION_REDIS_PORT`, `SESSION_REDIS_USERNAME`, `SESSION_REDIS_PASSWORD`, `SESSION_REDIS_TTL` | Session store. |
| Redis (user cache) | `USER_CACHE_REDIS_HOST`, `USER_CACHE_REDIS_PORT`, `USER_CACHE_REDIS_USERNAME`, `USER_CACHE_REDIS_PASSWORD` | User cache store. |
| Redis (rate limiter) | `RATE_LIMITER_REDIS_HOST`, `RATE_LIMITER_REDIS_PORT`, `RATE_LIMITER_REDIS_USERNAME`, `RATE_LIMITER_REDIS_PASSWORD` | Rate-limiter Redis connection. |
| Redis (shared) | `REDIS_HOST`, `REDIS_PORT`, `REDIS_USERNAME`, `REDIS_PASSWORD` | Optional ACL credentials. |
| JWT | `JWT_SECRET`, `JWT_ACCESS_TOKEN_SECRET`, `JWT_REFRESH_TOKEN_SECRET`, `JWT_ALGORITHM`, `JWT_*_TOKEN_EXPIRATION`, `JWT_*_TOKEN_COOKIE_*` | Secrets must be at least 32 bytes. Generate one with `openssl rand -base64 32`. |
| Ingress | `INGRESS_SHARED_SECRET` | Required for profile routes, at least 32 bytes; authenticates ingress-provided identity headers. Use a separate random secret. |
| Tokens | `SIGNIN_TOKEN_SECRET`, `JWT_PASSWORD_RESET_TOKEN_SECRET`, `JWT_PASSWORD_RESET_TOKEN_TTL_SECONDS` | Use separate secrets of at least 32 bytes. Reset links last 900 s by default. |
| Session cookie | `SESSION_SECRET`, `SESSION_COOKIE_*` | Express session cookie options. |
| Email (SMTP) | `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM` | `EMAIL_PORT` defaults to `587`. `EMAIL_USER` and `EMAIL_PASSWORD` are an optional pair. |
| Google OIDC | `OIDC_GOOGLE_CLIENT_ID`, `OIDC_GOOGLE_CLIENT_SECRET`, `OIDC_GOOGLE_CALLBACK_URL`, `OIDC_GOOGLE_SCOPE` | Required only for Google login. |
| HTTP server | `BODY_SIZE_LIMIT`, `MAX_CONNECTIONS`, `REQ_TIMEOUT_MS`, `REQ_HEADERS_TIMEOUT_MS`, `TOTAL_REQ_RES_CYCLE_TIMEOUT_MS`, `CONNECTION_KEEP_ALIVE_TIMEOUT_MS`, `CONNECTION_INACTIVITY_TIMEOUT_MS` | Connection and request limits. |

Never commit `.env`.

## API

Routes are versioned under `/v1`.

### Profile identity behind an ingress

`GET` and `PATCH /v1/profile/me` and `GET /v1/profile/:id` require an identity
asserted by a trusted ingress using `x-user-id` and `x-ingress-auth-secret`;
a bearer token alone is not accepted.
The ID must be the UUID returned in the successful `/v1/auth/verify` response.
GET looks up the current profile by ID; PATCH updates that same user.
Unknown users receive 404. A lookup by ID returns the full profile for the
authenticated user's own ID, and only public fields for another user.
Profile reads use the user-cache Redis instance with separate `profile:` keys
and a five-minute TTL, falling back to MySQL on a cache miss. Profile updates
invalidate the corresponding entry, and Redis errors are returned to the caller.
If invalidation fails after a MySQL update, the update has already committed and
the old cache entry can remain until expiry. Cached profiles contain private
data, so protect Redis access and persistence accordingly.

For ingress authentication, set `INGRESS_SHARED_SECRET` to a separate random
secret of at least 32 bytes and configure the ingress to send the same secret
in `x-ingress-auth-secret`. Store it in a secret manager, not in ingress
annotations or logs. Configure the ingress to discard client-supplied
`x-user-id` and `x-ingress-auth-secret` and set them only after a successful
auth subrequest, using the `x-user-id` response header from `/v1/auth/verify`.
Restrict direct access to the authentication service and protect the
ingress-to-service connection (for example with network policy and TLS).
Without that boundary, a caller who obtains the shared secret can impersonate
any user. The header path fails closed if the secret is missing or invalid.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/auth/login` | Body `{ email, password }`. Sets access and refresh token cookies and returns the public user profile. |
| POST | `/v1/auth/signin` | Body `{ email, password, name }`. Creates a pending account and sends a verification email. |
| GET | `/v1/auth/verify-email?token=...` | Verifies the email address using the emailed token. `token` is required. |
| POST | `/v1/auth/verify` | Validates the access token (`Authorization` header) and returns user details in `x-user-*` response headers. |
| POST | `/v1/auth/refresh` | Issues a new access token. Requires the refresh-token cookie. |
| POST | `/v1/auth/logout` | Clears both token cookies. |
| POST | `/v1/auth/forgot-password` | Body `{ email }`. Sends a password reset link if the account exists. |
| GET | `/v1/auth/oidc/google` | Starts Google OIDC login (callback at `/v1/auth/oidc/google/callback`). |
| GET | `/v1/auth/oidc/google/callback` | Completes Google authentication and returns `{ success: true, data: user }`. |
| POST | `/v1/auth/change-password` | Body `{ token, newPassword }`. Verifies the emailed reset token and changes the password only if its user ID and email still match the account. |
| GET | `/v1/auth/csrf` | Not implemented (`501`). |

Request bodies are validated with strict Zod schemas in `src/validators`.
Invalid input returns `400` with `Validation failed`.

The password reset checks the current email and updates the password in one
MySQL transaction while locking the user row, so concurrent email updates are
serialized with the reset. Reset links are single-use: their active-token
record is consumed in the same transaction as the password update. Apply the
active-tokens migration before using password resets. Previously issued links
without a corresponding active-token record will be rejected. Expired records
are not automatically cleaned up. A failed email delivery can leave an
unused record until expiry; the delivery error is returned to the caller.

### Health application

A separate app listens on `HEALTH_APP_PORT` (default `3001`):

| Path | Description |
|------|-------------|
| `GET /startup` | `200` once the service has started. |
| `GET /live`, `GET /ready` | Registered; return `501` until the checks are implemented. |
| `GET /metrics` | Prometheus metrics (default Node.js metrics and HTTP request counters/durations). |

The Compose Prometheus service uses the root [`prometheus.yml`](./prometheus.yml)
to scrape this endpoint from the `app:3001` container address every 15 seconds.

## Project Structure

```
src/
  app.js, server.js, healthApp.js   Application entry points
  config/                           Environment config and Passport strategies
  controllers/                      HTTP handlers (versioned: mainApp/v1)
  services/                         Business logic (created by factory functions)
  repositories/                     Data access (Sequelize models)
  models/                           Sequelize models
  validators/                       Zod request validators
  middlewares/                      Express and Passport middlewares
  infrastructure/database/          MySQL, MongoDB, and Redis clients
  routes/                           Route registration (mainApp, healthApp)
  errors/, constants/, utils/       Shared helpers
  monitoring/                       Prometheus metrics
  views/                            Email templates (EJS)
migrations/, seeds/                 Database migrations and seed data
tests/                              unit/ and integration/ Jest suites
scripts/                            Shell helpers for building and starting
```

Layering: routes → validators/middlewares → controllers → services →
repositories. Service methods take the request-scoped logger (`req.log`) as
their final argument; see [src/services/README.md](./src/services/README.md).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start with nodemon. |
| `npm start` | Start with Node. |
| `npm test` | Run the Jest suites. |
| `npm run test:watch` / `npm run test:coverage` | Watch mode / coverage report. |
| `npm run lint` | Run ESLint. |
| `npm run db:migrate` / `db:migrate:undo` | Apply or revert migrations. |
| `npm run db:seed` / `db:seed:undo` | Apply or revert seeds. |
| `npm run db:migration:create -- <name>` | Generate a migration. |

## Testing

```sh
npm test
```

Tests mock external services (databases, email), so no running infrastructure
is needed.

### Load testing with k6

Install [Grafana k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) and
start the service in an isolated, non-production environment. Use the single
`tests/load/route.js` script to test a route by setting k6 environment variables:

- `K6_BASE_URL` (optional): API base URL; defaults to `http://127.0.0.1:3000`.
- `K6_PATH` (required): route path beginning with `/`, such as `/v1/auth/login`.
  The previous `K6_ROUTE` name is also supported if `K6_PATH` is unset.
- `K6_METHOD` (optional): HTTP method; defaults to `POST`.
- Route-specific payload variables: JSON request bodies selected from `K6_METHOD`
  and `K6_PATH`, as described below. `K6_PAYLOAD`, if set, overrides the
  route-specific payload.
- `K6_EXPECTED_STATUS` (optional): expected HTTP response status; defaults to `200`.
- `K6_VUS` and `K6_DURATION` (optional): load settings; default to one virtual
  user for `60s`. For safety, `K6_VUS` is limited to 20 and `K6_DURATION` to
  10 minutes (specified in seconds or minutes).

Sample payloads for all registered routes are in `tests/load/.env.example`.
Copy the assignments to `tests/load/.env` and replace placeholder credentials,
tokens and IDs with disposable test values. The local `.env` is ignored by Git.

The script selects `K6_METHOD_<METHOD>_PATH_<PATH>_PAYLOAD`: the method is
uppercased, the query string is excluded, and each non-alphanumeric character in
the path becomes `_`. For example, `POST /v1/auth/login` selects
`K6_METHOD_POST_PATH__v1_auth_login_PAYLOAD`, and `POST
/v1/auth/forgot-password` selects
`K6_METHOD_POST_PATH__v1_auth_forgot_password_PAYLOAD`. Different paths that
normalize to the same key share a payload; use `K6_PAYLOAD` to override it.
An unset or empty payload sends no request body. For a route containing an ID,
replace the ID in both the path and its payload variable name.

For example, after configuring the login payload, run from the repository root:

```sh
(
  set -a
  source ./tests/load/.env &&
    K6_METHOD=POST K6_PATH=/v1/auth/login k6 run tests/load/route.js
)
```

For another route, set `K6_METHOD` and `K6_PATH` to select its payload. The
script checks the response status and enforces check-rate and p95 response-time
thresholds. It does not configure authentication headers or cookies; routes
requiring credentials beyond the body need additional request configuration.

Alternatively, store the selection and other `K6_*` variables in the trusted,
shell-compatible `tests/load/.env` file and run:

```sh
(
  set -a
  source ./tests/load/.env && k6 run tests/load/route.js
)
```

Sourcing a file executes its contents; do not source an untrusted file. Keep
test credentials out of version control. Some routes, such as signin, may create
accounts or otherwise change data; use dedicated test credentials and disposable
data. Do not run load scenarios against production or shared environments; run
them only with authorization and while monitoring rate limits, the service, and
its backing stores.

## Logging

Logs are JSON-friendly Pino output. Each HTTP request gets an id (`req.id`) in
its completion log. Use `req.log` inside handlers and pass it to services so
every log line of a request can be correlated. When shipping logs to Loki, keep
`requestId` and `userId` as parsed fields rather than labels to avoid high
label cardinality.
