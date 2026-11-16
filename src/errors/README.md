# Errors

Application error classes. Throw these from services, validators and
middleware; the [error middleware](../middlewares/error.middleware.js) turns
them into HTTP responses. Import them from the index:

```js
const { NotFoundError, ValidationError } = require('#src/errors/index.js');
```

## Classes

All classes extend `AppError`, which extends `Error`. Every class accepts an
optional message and status code that override the defaults below.

| Class | Default status | Default message | Used for |
| --- | --- | --- | --- |
| `AppError` | `500` | (required) | Base class; use directly for other operational errors, e.g. `new AppError('...', 500)`. |
| `ValidationError` | `400` | (required) | Invalid input or an invalid/expired verification link. |
| `AuthenticationError` | `401` | `Authentication failed` | Missing or invalid credentials or tokens. |
| `NotFoundError` | `404` | `Resource not found` | Unknown resource or route. |
| `ConflictError` | `409` | `A conflict occurred` | Resource already exists (e.g. email already registered). |
| `PayloadTooLargeError` | `413` | `Payload Too Large` | Request body over `BODY_SIZE_LIMIT`. |
| `ExternalServiceError` | `502` | `External service error` | A dependency returned an error. |
| `ExternalServiceTimeoutError` | `504` | `External service request timed out` | A dependency did not respond in time (e.g. email sending aborted). |

`ExternalServiceError` is not exported from `index.js` yet; require it from
`#src/errors/ExternalServiceError.js` or add it to the index before using it.

## `AppError` properties

- `name`: the class name.
- `statusCode`: the HTTP status code (`500` if none is given).
- `status`: `'fail'` for 4xx codes, `'error'` otherwise.
- `isOperational`: always `true`, marking an expected error rather than a bug.

## `ValidationError`

The constructor takes either a message string or a Zod error; anything else
throws a `TypeError`. For a `ZodError` the message is `Validation failed`, the
original error is kept as `cause`, and the issues are exposed as:

```js
error.errors // [{ field: 'email', message: 'Invalid email address' }, ...]
```

`field` is the dot-joined issue path. `error.details.validationErrors` holds the
same list.

## How errors become responses

`error.middleware.js` is registered last in `app.js` and builds the response:

- An `AppError` responds with its `statusCode` and
  `{ success: false, message }`, plus `errors` when the error has them
  (`ValidationError`).
- Any other error responds with `500` and the generic message
  `Internal Server Error`, so internal details are never leaked.
- Body-parser's `entity.too.large` error is converted to `PayloadTooLargeError`.
- When `NODE_ENV` is `development`, the response also includes `stack`.
- The error is attached to `res.err` so `pino-http` logs it with the request.

`notFound.middleware.js` runs before it and passes a `NotFoundError`
(`Route not found: <METHOD> <url>`) for unmatched routes.

In handlers, forward errors with `next(error)` rather than writing error
responses directly.
