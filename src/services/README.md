# Services

Services contain business logic.

Controllers should delegate business operations to services.

Service modules export factories. Tests can inject repositories, clients, and
configuration into those factories. Production controllers instantiate
services without arguments; repository-backed services resolve their
repositories from the shared registry after Sequelize models are configured at
startup, and other services use their imported configuration or clients.
Request-facing service methods accept the request-scoped logger as their final
argument. Controllers pass `req.log`, and services forward it to nested service
calls; callers outside an HTTP request can omit it to use the application
logger.

`login.service.js` returns `loginUser(credentials)`. It finds users by email or
phone, verifies the supplied password against its bcrypt hash, and signs a
one-hour JWT. The controller places the JWT in an HttpOnly cookie and returns
only public user fields. Apply the login-identifier SQL migration before
enabling email or phone login; the service requires a `JWT_SECRET` of at least
32 bytes.

`verify.service.js` returns the current public user profile for an
authenticated user ID, or an authentication error if that user no longer
exists.

`oidc/googleCallback.service.js` returns the user supplied by the Google
Passport strategy, or an authentication error when no user is present.

`refresh.service.js` creates a one-hour access token for the authenticated
user supplied by the refresh route's authentication middleware.

`logout.service.js` reports completion of the stateless logout flow. Token
cookies are cleared by the controller; without server-side token persistence,
logout does not revoke previously issued JWTs.

`email.service.js` creates a `sendEmail` service using the SMTP transport from
`integrations/mailClient.js`. Configure `EMAIL_HOST` and `EMAIL_FROM`; `EMAIL_PORT` defaults
to `587`, and optional SMTP authentication requires both `EMAIL_USER` and
`EMAIL_PASSWORD`.

`signin.service.js` checks for an existing email address and creates a
24-hour AES-256-GCM verification token containing the email, bcrypt password
hash, and name. The sign-in endpoint currently accepts email only; phone
sign-in is not enabled. It emails a link to
`/api/v1/auth/verify-email`; set `API_BASE_URL` to the externally reachable API
origin (defaults to `http://localhost:3000`). Configure `SIGNIN_TOKEN_SECRET`
with a separate secret of at least 32 bytes. The verification endpoint itself
is not implemented yet.
