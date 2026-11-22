# Controllers

Controllers handle HTTP requests and responses. Keep them thin: they pass
validated input to a service, shape the HTTP response (status, body, cookies,
headers) and forward every error to the shared error middleware with
`next(error)`. Business logic belongs in [services](../services/README.md).

## Layout and registry

Controllers live under `mainApp/v1/` and are exported through nested registry
objects, so routes look them up by key and instantiate them with a service:

```js
const { "mainApp.versions": { v1: { "auth.controllers": controllers } } } = require('#src/controllers/index.js');
const signinController = controllers['signin.controller'](services['signin.service']());
```

Routes are mounted under `/v1` (`/v1/auth`, `/v1/profile`).

| Registry | Key | Module | Handlers |
| --- | --- | --- | --- |
| `auth.controllers` | `login.controller` | `auth/login.controller.js` | `post` (others `501`) |
| | `verify.controller` | `auth/verify.controller.js` | `post` |
| | `verify-email.controller` | `auth/verifyEmail.controller.js` | `get` |
| | `refresh.controller` | `auth/refresh.controller.js` | `post` |
| | `logout.controller` | `auth/logout.controller.js` | `post` |
| | `signin.controller` | `auth/signin.controller.js` | `post` |
| | `forgot-password.controller` | `auth/forgotPassword.controller.js` | `post` |
| | `change-password.controller` | `auth/changePassword.controller.js` | `post` |
| | `oidc.controllers` → `google-callback.controller` | `auth/oidc/googleCallback.controller.js` | `get` |
| `profile.controllers` | `me.controller` | `profile/me.controller.js` | `get`, `patch` |
| | `profile-by-id.controller` | `profile/profileById.controller.js` | `get` |

## Conventions

- Each module exports a factory that receives its service, so tests can inject
  a stub service.
- Handlers are `async (req, res, next)` and wrap the service call in
  `try`/`catch`, returning `next(error)` on failure.
- Request-validated data comes from `req.body`, `req.query` or `req.params`
  (validators run in the route before the controller). The authenticated user
  comes from `req.user`, set by Passport or the profile identity middleware.
- Services receive the request-scoped logger `req.log` as their last argument.
  Services that send email also receive `req.abortSignal` before the logger.
- Token cookies are set and cleared only in controllers, using
  `config.auth.jwt.cookieOptions.access` and `.refresh` (name, `httpOnly`,
  `secure`, `sameSite`, `maxAge`, `path`).

## Auth controllers

Routes are mounted at `/v1/auth`.

| Controller | Route | Behavior |
| --- | --- | --- |
| `login.controller.js` | `POST /login` | `req.user` is set by the Passport `basic` strategy and passed to `loginService.loginUser`. Sets the refresh and access cookies and returns `200 { success: true, data: { user } }`. `get`, `put`, `patch` and `delete` return `501 Not Implemented`. |
| `signin.controller.js` | `POST /signin` | Calls `signin(req.body, req.abortSignal, req.log)` and returns `200` with the service result. The user is only created once the emailed link is opened. |
| `verifyEmail.controller.js` | `GET /verify-email?token=` | Calls `verifyEmail(token, req.log)`. A new account sets both token cookies and returns `201`; a reused link or conflict sets no cookies and returns `200`. The body is the service's `response`. |
| `verify.controller.js` | `POST /verify` | Behind the Passport JWT middleware (access token in the `Authorization` header). Returns an empty `200` with `x-user-id`, `x-user-email` and `x-user-name` response headers for the upstream gateway. |
| `refresh.controller.js` | `POST /refresh` | Behind the Passport JWT middleware (refresh token cookie). Sets a new access-token cookie and returns `200 { success: true }`. |
| `logout.controller.js` | `POST /logout` | Clears both token cookies and returns `200 { success }`. Logout only clears browser cookies; it does not revoke JWTs that were already issued. |
| `forgotPassword.controller.js` | `POST /forgot-password` | Calls `forgotPassword(req.body, req.abortSignal, req.log)` and returns `200` with the service result (the same for unknown emails). |
| `changePassword.controller.js` | `POST /change-password` | Calls `changePassword(req.body, req.log)` and returns `200` with the service result. |
| `oidc/googleCallback.controller.js` | `GET /oidc/google/callback` | After the Google Passport strategy succeeds, returns `200 { success: true, user: req.user }`. |

`GET /v1/auth/csrf` is registered in the router but still returns
`501 Not Implemented` without a controller.

## Profile controllers

Routes are mounted at `/v1/profile`. Identity comes from the
`profileIdentityMiddleware`, which trusts the `x-user-id` header only when
`x-ingress-auth-secret` matches `INGRESS_SHARED_SECRET`; the controllers never
read those headers themselves.

- `me.controller.js`: `GET /me` returns the caller's profile and
  `PATCH /me` updates it, both as `200 { success: true, data: { profile } }`.
- `profileById.controller.js`: `GET /:id` returns the full profile when `:id`
  is the requester's own ID and only public fields (`id`, names, photo) for
  other users, as `200 { success: true, data: { profile } }`.

Both delegate to the injected profile service.
