# Validators

Request validation logic belongs here. Validators are grouped by path and HTTP
method. `login.validator.js` exposes `get`, `post`, `put`, `patch`, and `delete`
middleware; only `post` currently validates a request body with Zod. The other
methods pass through to their controller handlers, which currently return
`501 Not Implemented`.
