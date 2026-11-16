# Routes

Express routers. A router wires paths to validators, middleware and
controllers; it contains no business logic. `index.js` exports one router tree
per application:

```js
const { healthAppRoutes, mainAppRoutes } = require('./routes');
```

| Export | Application | Mounted at |
| --- | --- | --- |
| `mainAppRoutes.v1` | Main API (`app.js`) | `/v1` |
| `healthAppRoutes` | Health application (`healthApp.js`, `HEALTH_APP_PORT`) | `/` |

## Layout

```
routes/
├── index.js                 # healthAppRoutes, mainAppRoutes
├── healthApp/index.js       # operational endpoints
└── mainApp/
    └── v1/
        ├── index.js         # mounts /auth and /profile
        ├── auth/
        │   ├── index.js     # /v1/auth routes
        │   └── OIDC/index.js  # /v1/auth/oidc routes
        └── profile/index.js # /v1/profile routes
```

## Conventions

- A route file creates its services and controllers once at load time, then
  lists routes as `router.<method>(path, ...validators, ...middleware,
  controller.<method>)`. Order matters: validate input first, then
  authenticate, then call the controller.
- Controllers and services come from their registries
  (`#src/controllers/index.js`, `#src/services/index.js`), so route files do
  not import individual modules. Services created here must not read
  repositories until a request runs; see [repositories](../repositories/README.md).
- Request validators come from `#src/validators/index.js`; authentication
  middleware from `#src/middlewares/index.js` (see
  [middlewares](../middlewares/README.md)).
- Unmatched paths fall through to `notFound.middleware` and then
  `error.middleware` in `app.js`.
- To add a version, create `mainApp/v<n>/index.js` and mount it in
  `app.js`.

## Main API: `/v1/auth`

| Method and path | Validator | Authentication | Controller |
| --- | --- | --- | --- |
| `POST /login` | `login.validator` | Passport `basic` (email and password), no session | `login.controller` |
| `POST /signin` | `signin.validator` | none | `signin.controller` |
| `GET /verify-email` | `verify-email.validator` | none (signed token in the query) | `verify-email.controller` |
| `POST /verify` | `verify.validator` | Passport JWT, access token from the `Authorization` header | `verify.controller` |
| `POST /refresh` | `refresh.validator` | Passport JWT, refresh token from the cookie | `refresh.controller` |
| `POST /logout` | none | none | `logout.controller` |
| `POST /forgot-password` | `forgot-password.validator` | none | `forgot-password.controller` |
| `POST /change-password` | `change-password.validator` | none (signed reset token in the body) | `change-password.controller` |
| `GET /csrf` | `csrf.validator` | none | inline handler, `501 Not Implemented` |

`/login` uses the `passportLogin` service, because the `basic` strategy has
already authenticated the user.

### `/v1/auth/oidc`

| Method and path | Behavior |
| --- | --- |
| `GET /google` | Starts the Google sign-in with Passport `google`. |
| `GET /google/callback` | Completes it and returns the user through `google-callback.controller`. A failed login redirects to `http://localhost:3000/login`, which is hard-coded. |

## Main API: `/v1/profile`

Every route first runs `profileIdentityMiddleware`, which accepts the request
only from the trusted gateway (`x-user-id` plus the `x-ingress-auth-secret`
shared secret).

| Method and path | Validator | Controller |
| --- | --- | --- |
| `GET /me` | none | `me.controller` |
| `PATCH /me` | `profile.validator.patch` | `me.controller` |
| `GET /:id` | `profile.validator.get` | `profile-by-id.controller` |

`/me` is declared before `/:id` so that `me` is not captured as an ID.

## Health application

Served on its own port, separate from the main API.

| Method and path | Behavior |
| --- | --- |
| `GET /startup` | `200` once the process is up. |
| `GET /live` | `501 Not Implemented`. |
| `GET /ready` | `501 Not Implemented`. |
| `GET /metrics` | Prometheus metrics (see [monitoring](../monitoring/README.md)). |
| any other path | `404 { success: false, message: 'Endpoint not found' }` |
