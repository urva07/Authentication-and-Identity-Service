# Services

Services contain business logic. Controllers delegate business operations to
services.

## Layout and registry

Services are grouped under `mainApp/` and exported through nested registry
objects, so routes look them up by key:

```js
const { "mainApp.services": { "auth.services": services } } = require('#src/services/index.js');
const signinService = services['signin.service']();
```

| Registry | Key | Module |
| --- | --- | --- |
| `auth.services` | `login.service` | `auth/login.service.js` |
| | `passport-login.service` | `auth/passportLogin.service.js` |
| | `verify.service` | `auth/verify.service.js` |
| | `verify-email.service` | `auth/verifyEmail.service.js` |
| | `refresh.service` | `auth/refresh.service.js` |
| | `logout.service` | `auth/logout.service.js` |
| | `email.service` | `auth/email.service.js` |
| | `signin.service` | `auth/signin.service.js` |
| | `forgot-password.service` | `auth/forgotPassword.service.js` |
| | `change-password.service` | `auth/changePassword.service.js` |
| | `oidc.services` → `google-callback.service` | `auth/oidc/googleCallback.service.js` |
| `profile.services` | `profile.service` | `profile/profile.service.js` |

## Conventions

- Every service module exports a factory. Tests inject repositories, clients
  and configuration through the factory's options object; invalid injected
  dependencies throw a `TypeError`. Production code calls the factory without
  arguments.
- Repository-backed services resolve repositories lazily, on first use inside a
  service method, from the shared registry (`getUserRepository()` and friends
  in `#src/repositories/index.js`). The registry is populated by `server.js`
  after the database connections are up, so a factory must not call these
  getters while it is being created: routes create services when `app.js` is
  loaded, which happens before the repositories exist.
- Request-facing methods accept the request-scoped logger as their final
  argument. Controllers pass `req.log`, and services forward it to nested
  calls; callers outside an HTTP request can omit it to use the application
  logger. Methods that send email also accept an `AbortSignal` before the
  logger.
- Concurrent identical reads (for example `userRepository.findByEmail` for the
  same email) are deduplicated with `requestCoalescer`, keyed by
  `createCoalescingKey`.
- Failures are reported with the error classes from `#src/errors/index.js`
  (`AuthenticationError`, `ValidationError`, `ConflictError`, `NotFoundError`,
  ...), which the error-handling middleware turns into HTTP responses.

## Auth services

### Login and tokens

`passportLogin.service.js` returns `loginUser(user, logger)` and backs
`POST /v1/auth/login`. The user is authenticated beforehand by the Passport
`basic` strategy; the service throws an `AuthenticationError` if no user was
supplied, otherwise it issues an access and a refresh JWT and returns them with
the public user fields (`id`, `email`, `phone`, `firstName`, `lastName`,
`profilePhoto`, `profileCompleted`). The controller sets the token cookies.

`login.service.js` returns `loginUser(credentials, logger)`. It finds the user
by normalized email, verifies the password against the stored bcrypt hash and
returns the same `{ accessToken, refreshToken, user }` shape. Any failure
yields the generic `Invalid login credentials` error. It is registered but is
not currently wired to a route.

`verify.service.js` returns `verifyUser(user, logger)`, which hands back the
user attached by the Passport JWT strategy (access token from the
`Authorization` header) or throws an `AuthenticationError`.

`refresh.service.js` returns `refreshAccessToken(user, logger)`, which signs a
new access token for the user authenticated by the refresh route (refresh token
cookie). `jwt` and `jwtSecret` are injectable. The secret must be at least 32
bytes.

`logout.service.js` returns `logoutUser(logger)` and reports completion of the
stateless logout flow. Cookies are cleared by the controller; without
server-side token persistence, logout does not revoke previously issued JWTs.

`oidc/googleCallback.service.js` returns a handler that passes through the user
supplied by the Google Passport strategy.

### Sign-in and email verification

`signin.service.js` returns `signin({ email, password, name }, signal, logger)`
and backs `POST /v1/auth/signin`.

1. Looks up the normalized email and throws a `ConflictError` if the account
   already exists.
2. Hashes the password (`BASIC_HASH_SALT_ROUNDS`) and builds an AES-256-GCM
   token containing the email, password hash, name, a new user ID (`sub`) and
   `jti`. The token expires after `BASIC_SIGNIN_AES_256_GCM_TOKEN_TTL_SECONDS`
   (default 1800).
3. Emails a link to `/v1/auth/verify-email?token=...` built from
   `API_BASE_URL`, rendered from `src/views/emailTemplates/verifyEmail.ejs`.

No user is created at this point. The sign-in endpoint accepts email only; phone
sign-in is not enabled. Set `BASIC_SIGNIN_AES_256_GCM_TOKEN_SECRET` to a secret
that is separate from the JWT secrets.

`verifyEmail.service.js` returns `verifyEmail(token, logger)` and backs
`GET /v1/auth/verify-email`. It decrypts and validates the token, then, inside
one MySQL transaction, creates the user and its password record, and returns
fresh access and refresh tokens. The result carries a `conflict` flag:

- an existing user with the same ID and email is treated as a reused link
  (`conflict: true`, success response);
- an existing user with a different email, or an invalid or expired token,
  throws a `ValidationError`;
- a unique-constraint race during creation returns `conflict: true` with
  `success: false`.

Injectable: `userRepository`, `userPasswordRepository`, `mysqlSequelizeClient`.

### Password reset

`forgotPassword.service.js` returns
`forgotPassword({ email }, signal, logger)` and backs
`POST /v1/auth/forgot-password`. For a known email it signs a password-reset
JWT (`JWT_PASSWORD_RESET_TOKEN_SECRET`, TTL
`JWT_PASSWORD_RESET_TOKEN_TTL_SECONDS`, default 900), records its `jti` in the
active-token repository and emails a link to `/v1/auth/change-password?token=...`
(template `forgotPassword.ejs`). The response is identical for unknown emails so
the endpoint cannot be used to discover accounts.

`changePassword.service.js` returns
`changePassword({ token, newPassword }, logger)` and backs
`POST /v1/auth/change-password`. It validates the reset token (signature,
expiry, purpose and claim shape; the secret must be at least 32 bytes), then in
one transaction locks the user row, consumes the single-use `jti` from the
active-token repository and updates the password hash. Any mismatch throws an
`AuthenticationError` with `Invalid or expired password reset link`. Injectable:
`userRepository`, `userPasswordRepository`, `activeTokenRepository`,
`mysqlSequelizeClient`.

### Email

`email.service.js` returns `sendEmail({ to, subject, text, html }, signal, logger)`
using the SMTP transport from `integrations/mailClient.js`. At least one of
`text` or `html` is required. Aborting the signal rejects with an
`ExternalServiceTimeoutError`. Configure `EMAIL_HOST` and `EMAIL_FROM`;
`EMAIL_PORT` defaults to `587`, and optional SMTP authentication requires both
`EMAIL_USER` and `EMAIL_PASSWORD`. Injectable: `transporter`, `emailConfig`.

Services that send mail (`signin`, `forgot-password`) create the email service
on first use, or accept an `emailService` option.

## Profile service

`profile/profile.service.js` returns `getMyProfile(user, logger)`,
`updateMyProfile(user, attributes, logger)` and
`getProfileById(requester, id, logger)`.

- Profiles are read through the Redis user cache. A cache read failure falls
  back to MySQL, a database hit is written back to the cache unless the user is
  locked, and cache errors never fail the request. Concurrent lookups for the
  same profile are coalesced.
- `getMyProfile` and `updateMyProfile` return the private profile (including
  email, phone, date of birth and gender).
- `getProfileById` returns the private profile when the requester is the owner,
  and only `id`, `firstName`, `lastName` and `profilePhoto` otherwise.
- A missing profile throws a `NotFoundError`; a missing authenticated user
  throws an `AuthenticationError`.

Injectable: `userRepository`, `profileCacheRepository`, `userLockRepository`.
