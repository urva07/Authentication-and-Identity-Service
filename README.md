# First-shell-project

Express.js backend application.

## Installation

npm install

## Environment

cp .env.example .env

Set `MONGO_USERNAME`, `MONGO_PASSWORD`, `MONGO_HOST`, and `MONGO_DB_NAME`,
`MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_HOST`, and `MYSQL_DATABASE`, plus
`REDIS_HOST` and a `JWT_SECRET` of at least 32 bytes before starting the server.
Set `CORS_ORIGIN` to the exact frontend origin when making credentialed
cross-origin requests; browser clients must include credentials for those
requests. Database clients are configured using host, port, database, and
credential options. Mongoose requires a base MongoDB URI, while its database
name and credentials are passed separately as options.
Set `SIGNIN_TOKEN_SECRET` to a separate secret of at least 32 bytes for
AES-256-GCM sign-in verification tokens.
Set `API_BASE_URL` to the externally reachable API origin for verification
email links; it defaults to `http://localhost:3000`.
`EXTERNAL_API_TIMEOUT_MS` sets the deadline for cancellable downstream calls
(default `10000` ms). Middleware exposes the request-scoped `req.abortSignal`;
pass it to clients such as `fetch` using `{ signal: req.abortSignal }`.
Aborting the signal does not cancel clients that do not support `AbortSignal`.
SMTP delivery uses `EMAIL_HOST` and `EMAIL_FROM`; `EMAIL_PORT` defaults to
`587`, and `EMAIL_USER`/`EMAIL_PASSWORD` are an optional pair.

For development, run `npm run db:migrate` followed by `npm run db:seed` to
create the mock account documented in [seeds/README.md](./seeds/README.md).

## Development

npm run dev

## Production

npm start

## Docker

If you do not already have a `.env`, create it from `.env.example`. Set
`MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_ROOT_PASSWORD`, and a
`JWT_SECRET` of at least 32 bytes. Compose starts the app with MySQL and Redis
and configures the app to reach them by their service names.

```sh
cp -n .env.example .env
docker compose up --build -d
```

The API is available on port `3000`; the startup endpoint is on port `3001` at
`/startup`. Check service status with `docker compose ps`, view logs with
`docker compose logs -f app`, and stop the stack with `docker compose down`.
MySQL and Redis data persist in named volumes. Apply database migrations with
`docker compose exec app npm run db:migrate`.

## Start with local databases

`npm run startwithdb` starts the Homebrew services `mysql` and `redis`. Since
the installed MongoDB formula may not provide a Homebrew service definition,
the script starts `mongod` directly with `$(brew --prefix)/etc/mongod.conf`
when nothing is listening on port `27017`, then starts the application.
Install the database binaries and ensure the MongoDB configuration file exists
at that path.

## Tests

npm test

## Test Coverage

npm run test:coverage

## API

Health check:

GET /health
GET /health/live
GET /health/ready
GET /health/metrics

`/health/metrics` exposes Prometheus text-format default Node.js/process metrics
and custom HTTP request totals, failed responses (4xx/5xx), and request
durations for scraping. Request durations use the `responseTime` measurement
from `pino-http`. HTTP metrics are labeled by method and status code.

The liveness and readiness routes are registered but return `501 Not
Implemented` until their health-check logic is added.

Health application:

GET http://localhost:3001/startup

The health application listens on `HEALTH_APP_PORT` (default `3001`). Its
startup endpoint returns `503` until database connections and the main HTTP
server are initialized.

Authentication endpoint:

POST /api/v1/auth/login
POST /api/v1/auth/signin

Login accepts either an email or phone number and a password. A successful
login sets a one-hour `HttpOnly` `auth_token` cookie and returns public user
profile fields. Apply `migrations/001_add_login_identifiers_to_users.sql`
before using email or phone login against an existing database.

Sign-in accepts `contactType` (`email` or `phone`), the matching `email` or
`phone`, `password`, and `name`. Sign-in business logic is not implemented yet.

Authentication routes:

POST /api/v1/auth/verify
POST /api/v1/auth/signin
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/forgot-password
POST /api/v1/auth/change-password
GET /api/v1/auth/csrf
GET /api/v1/auth/verify-email/

`signin`, `forgot-password`, `change-password`, `csrf`, and `verify-email`
currently return `501 Not Implemented`.

Authenticated profile endpoints (business logic not implemented yet):

GET /api/v1/profile/me
PATCH /api/v1/profile/me
GET /api/v1/profile/:id

## Project Structure

First-shell-project/
|
|-- src/
|   |-- config/
|   |   |-- env.js
|   |   |-- database.js
|   |
|   |-- controllers/
|   |-- models/
|   |-- repositories/
|   |-- views/
|   |-- routes/
|   |   |-- index.js
|   |
|   |-- services/
|   |-- errors/
|   |   |-- AppError.js
|   |   |-- index.js
|   |
|   |-- middlewares/
|   |   |-- auth.middleware.js
|   |   |-- error.middleware.js
|   |   |-- notFound.middleware.js
|   |
|   |-- validators/
|   |-- utils/
|   |   |-- logger.js
|   |
|   |-- constants/
|   |   |-- index.js
|   |
|   |-- app.js
|   |-- server.js
|
|-- tests/
|   |-- unit/
|   |-- integration/
|   |   |-- health.test.js
|   |-- fixtures/
|   |-- setup.js
|
|-- migrations/
|-- seeds/
|-- docs/
|
|-- .env
|-- .env.example
|-- .gitignore
|-- jest.config.js
|-- package.json
|-- README.md
