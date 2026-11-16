# Middlewares

Express middleware used by the main application. The index
(`#src/middlewares/index.js`) exposes both the local middleware and the
third-party ones the app uses, under one object:

```js
const middlewares = require('#src/middlewares/index.js');

app.use(middlewares.helmet());
app.use(middlewares['abort-signal.middleware']);
```

## Application stack

`app.js` registers middleware in this order:

1. `pinoHttp`: request logging (sets `req.log`). Authorization, cookie and
   ingress-secret headers are redacted. Request metrics are recorded when the
   response finishes.
2. `helmet`: security headers.
3. `cors`: origin from `config.services.frontend.baseUrl`, with credentials.
4. `rateLimiter` (`express-rate-limit`): per-IP limit per one-minute window.
5. `json` and `urlencoded`: body parsing, limited by `BODY_SIZE_LIMIT`.
6. `cookieParser`: populates `req.cookies`.
7. `session`: `express-session` backed by Redis, followed by Passport
   `initialize()` and `session()`.
8. `abort-signal.middleware`: sets `req.abortSignal`.
9. Routes mounted at `/v1`.
10. `notFound.middleware`, then `error.middleware`, which must stay last.

## Local middleware

| Key | Module | Purpose |
| --- | --- | --- |
| `abort-signal.middleware` | `abort-signal.middleware.js` | Adds `req.abortSignal`, aborted when the client disconnects or after `EXTERNAL_API_TIMEOUT_MS` (with an `ExternalServiceTimeoutError`). Pass it to external calls such as `sendEmail`. Listeners and timer are cleaned up when the response ends. |
| `passportJwt.middleware` | `passportJwt.middleware.js` | Route-level factory: `passportJwt({ type, source, options })` returns `passport.authenticate` for a registered JWT strategy. Supported pairs: `access` + `header` (`jwtAccessFromHeader`) and `refresh` + `cookie` (`jwtRefreshFromCookie`). Any other pair throws at route setup. Sessions are disabled. |
| `auth.middleware` | `auth.middleware.js` | Factory: `authenticate({ source, tokenType, userRepository })`. Reads a bearer token from the `Authorization` header or the token cookie, verifies it with the access or refresh secret (at least 32 bytes), loads the user and sets `req.user`. Returns an `AuthenticationError` for a missing token, an invalid token or an unknown user. This is a Passport-free alternative and is not mounted by any route currently. |
| `notFound.middleware` | `notFound.middleware.js` | Passes a `NotFoundError` (`Route not found: <METHOD> <url>`) for unmatched routes. |
| `error.middleware` | `error.middleware.js` | Final error handler. See [errors](../errors/README.md). |
| `notImplemented.middleware` | `notImplemented.middleware.js` | Responds with `501 { success: false, message: 'Not implemented' }`. |
| `requestCounterMiddleware` | `requestCounter.middleware.js` | Maintains `app.locals.requestCount` (in-flight requests) and destroys the socket after a response when `app.locals.shuttingDown` is set. Not mounted in `app.js` currently. |

`profileIdentity.middleware.js` is not in the index; routes require it
directly. It trusts the `x-user-id` header only when `x-ingress-auth-secret`
matches `INGRESS_SHARED_SECRET` (compared with `timingSafeEqual`; the secret
must be at least 32 bytes) and the ID is a UUID. It then sets
`req.user = { id }`. Anything else is an `AuthenticationError`. It is used by
the `/v1/profile` routes, which are expected to sit behind a gateway that
sets those headers.

## Conventions

- Middleware that needs configuration is a factory that returns the handler,
  and throws a `TypeError` for invalid options when the route is defined, not
  per request.
- Failures are passed on with `next(error)` using the classes from
  `#src/errors/index.js`; never write error responses directly.
- Use `req.log` for logging, falling back to the application logger.
- Repository-backed middleware resolves its repository lazily on the first
  request, because routes are created before the repositories are configured.
  Injecting a repository is supported for tests.
