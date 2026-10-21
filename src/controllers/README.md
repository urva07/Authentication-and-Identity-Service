# Controllers

Controllers handle HTTP requests and responses.

Keep controllers thin and delegate business logic to services.

`login.controller.js` groups the `/login` HTTP handlers (`get`, `post`, `put`,
`patch`, and `delete`). Only `post` is implemented; the other handlers return
`501 Not Implemented`. The implemented handler delegates validated input to
the injected login service and forwards errors to shared error middleware.

`signin.controller.js` handles validated `POST /signin` requests. Its handler
currently returns `501 Not Implemented` until the sign-in service is added.

`verify.controller.js` handles the authenticated `POST /verify` route. It
passes the authenticated user ID to the injected verify service and returns the
service's result.

`refresh.controller.js` handles the authenticated `POST /refresh` route. It
passes the authenticated user to the injected refresh service and returns the
new access token.

`logout.controller.js` clears the access-token and refresh-token cookies after
the logout service succeeds. Logout clears the browser cookies only; it does
not revoke already issued JWTs.
