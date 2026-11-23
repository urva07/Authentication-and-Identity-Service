# Validators

Express middleware that validates and normalizes incoming requests with
[Zod](https://zod.dev) before they reach a controller. Import them through the
registry:

```js
const validators = require('#src/validators/index.js');

router.post('/signup', validators['signup.validator'].post, signinController.post);
```

## Conventions

- One file per resource, named `<name>.validator.js` and registered in
  `index.js` as `<name>.validator`.
- A module exports its Zod schema (for example `signinSchema`) and one
  middleware per HTTP method: `get`, `post`, `put`, `patch`, `delete`. Methods
  with nothing to validate pass through, so routes can always pick the entry
  for their method.
- On success the parsed result replaces `req.body` (or `req.params`), so
  controllers receive trimmed, lower-cased and typed values. On failure the
  middleware calls `next(new ValidationError(zodError))`, which the error
  middleware turns into a `400` response with a `field`/`message` list. See
  [errors](../errors/README.md).
- Body schemas use `.strict()`, so unknown fields are rejected.
- Validators run before authentication in the route, so invalid requests are
  rejected cheaply.

## Registry

| Key | Validates | Rules |
| --- | --- | --- |
| `login.validator` | `post`: body | `email` (trimmed, lower-cased, valid, at most 254 characters) and `password` (4 to 15 characters). |
| `signup.validator` | `post`: body | `email` as above, `password` (4 to 15 characters) and `name` (trimmed, 2 to 100 characters). |
| `verify-email.validator` | `get`: query | `token` (string, 1 to 4096 characters). Other query parameters are allowed, and `req.query` is not rewritten. |
| `forgot-password.validator` | `post`: body | `email` (valid, trimmed). |
| `change-password.validator` | `post`: body | `token` (1 to 4096 characters) and `newPassword` (4 to 15 characters). |
| `verify.validator` | `post`: body | Empty object (`{}`) only; an absent body is treated as empty. |
| `refresh.validator` | `post`: body | Empty object only. |
| `csrf.validator` | `get`: body | Empty object only. |
| `profile.validator` | `get`: `req.params`, `patch`: body | `get` requires `id` to be a UUID. `patch` accepts any of `firstName`, `lastName` (1 to 100 characters), `phone` (digits with an optional leading `+`, 6 to 29 digits), `dateOfBirth` (`YYYY-MM-DD`), `gender` (1 to 30 characters) and `profilePhoto` (http or https URL, at most 500 characters). The last four may be `null` to clear them. At least one field is required. |

## Adding a validator

1. Create `<name>.validator.js` with a schema and a validate middleware for the
   method(s) it covers, plus pass-through entries for the rest.
2. Register it in `index.js`.
3. Use it in the route before authentication and the controller.

Keep password length limits aligned between `login`, `signup` and
`change-password`, since they are defined separately in each file.
