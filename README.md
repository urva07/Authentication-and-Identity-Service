# Auth Mail Service

`Auth_Mail_Service` is a Docker Compose workspace for authentication and external mail services.

## Repository Structure

```text
Auth_Mail_Service/
├── auth_service/
│   ├── src/
│   ├── conf/
│   ├── migrations/
│   ├── scripts/
│   └── .env
├── mail_service/
│   ├── src/
│   ├── conf/
│   ├── scripts/
│   └── .env
├── conf/
│   └── redis/
│       └── bullMQ.conf
├── docker-compose.yml
├── build.sh
├── start.sh
├── start:d.sh
└── stop.sh
```

## Services

- **auth_service**: Authentication and identity API on ports `3000` and `3001`.
- **mail_service**: Bull MQ mail worker on port `4000`.
- **mysql**: MySQL database for the authentication service.
- **redis_session**: Redis server for server-side sessions.
- **redis_user_cache**: Redis server for cached authenticated users.
- **redis_rate_limit**: Redis server for API rate limiting.
- **redis_bullMQ**: Shared Redis server for Bull MQ mail jobs.
- **prometheus**, **grafana**, **loki**, and **alloy**: Monitoring and logging services.

## Environment Variables

Create or maintain service environment files:

- `auth_service/.env`
- `mail_service/.env`

The authentication environment must provide at least:

```dotenv
MYSQL_PASSWORD=
MYSQL_DATABASE=
REDIS_PASSWORD=
```

Do not commit real credentials or secrets. Keep `.env` files excluded by Git.

## Docker Commands

Build the application:

```bash
./build.sh
```

Start in the foreground:

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
thresholds. Routes requiring credentials can use JSON header or cookie
configuration. For example:

```sh
K6_HEADERS='{"Authorization":"Bearer replace-with-test-access-token"}'
K6_COOKIES='{"accessToken":"replace-with-test-access-token"}'
K6_METHOD_POST_PATH__v1_auth_refresh_COOKIES='{"refreshToken":"replace-with-test-refresh-token"}'
```

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
