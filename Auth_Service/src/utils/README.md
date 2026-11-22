# Utilities

Small, framework-independent helpers. Import each module by path; `index.js`
is empty and does not re-export anything.

```js
const { generateAccessToken } = require('#src/utils/jwt.js');
```

| Module | Exports | Purpose |
| --- | --- | --- |
| `jwt.js` | `generateJWTtoken`, `verifyJWTtoken`, `generateAccessToken`, `generateRefreshToken`, `generatePasswordResetToken` | JWT signing and verification with `jsonwebtoken`. |
| `hashPasswordAndVerify.js` | `hashPassword`, `verifyPassword` | bcrypt password hashing. |
| `aes256GcmToken.js` | `generateAes256GcmToken`, `verifyAes256GcmToken`, `verifyAes256GcmTokenWithExpiry` | Encrypted, tamper-proof tokens for the email verification link. |
| `signinTokenKey.js` | `createSigninTokenKey` | Derives the AES key for those tokens from a secret. |
| `userIdGenerator.js` | `generateUUID`, `generateUniqueUserId` | Random identifiers. |
| `logger.js` | default `pino` logger | Application logger. |

## `jwt.js`

- `generateJWTtoken({ payload, expiry, secret })` signs a token with a random
  `jti` (UUID) added to the payload. `verifyJWTtoken({ token, secret })`
  verifies it and returns the payload, throwing the `jsonwebtoken` errors
  (`JsonWebTokenError`, `TokenExpiredError`, ...) on failure.
- `generateAccessToken(userId)` and `generateRefreshToken(userId)` sign
  `{ sub: String(userId) }` with the access or refresh secret and expiry from
  `config.auth.jwt`.
- `generatePasswordResetToken({ userId, email, purpose })` signs
  `{ sub, email, purpose }` with the password-reset secret; its lifetime is
  `JWT_PASSWORD_RESET_TOKEN_TTL_SECONDS`.

## `hashPasswordAndVerify.js`

`hashPassword(password, saltRounds)` defaults to `BASIC_HASH_SALT_ROUNDS`
(10). `verifyPassword(password, hash)` compares a password with a hash. Both are
async.

## `aes256GcmToken.js` and `signinTokenKey.js`

Tokens have the form `v1.<iv>.<authTag>.<ciphertext>` (base64url), encrypted
with AES-256-GCM using a random 12-byte IV and `v1` as additional
authenticated data. The payload is JSON.

- `generateAes256GcmToken(payload, key)` returns the token.
- `verifyAes256GcmToken(token, key)` returns the payload and throws on an
  unsupported version, a malformed token or a failed authentication check.
- `verifyAes256GcmTokenWithExpiry(token, key)` also requires the sign-in token
  shape (`email`, `passwordHash`, `name`, `sub`, `exp`, `jti`) and returns `null`
  when the shape is wrong or `exp` has passed.
- `createSigninTokenKey(secret)` returns the 32-byte key, a SHA-256 hash of a
  fixed context string and the secret. It throws unless the secret is at least
  32 bytes (`BASIC_SIGNIN_AES_256_GCM_TOKEN_SECRET`).

## `userIdGenerator.js`

`generateUUID()` returns a UUID v4 and is used for user IDs and `jti` values.
`generateUniqueUserId()` returns 32 random hex characters.

## `logger.js`

A `pino` logger at `debug` level. It prints readable output through
`pino-pretty` when the environment is `development`, and JSON otherwise.
Request-scoped code should use `req.log` and fall back to this logger.
