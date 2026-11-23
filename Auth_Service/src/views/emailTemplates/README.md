# Views

[EJS](https://ejs.co) templates used to render HTML. The API itself returns
JSON only; these templates are used for emails.

## Email templates

`emailTemplates/` holds the HTML bodies of the emails the service sends. Each
one is rendered by a service with `ejs.renderFile`, and the plain-text
alternative is built next to it in the service.

| Template | Used by | Variables |
| --- | --- | --- |
| `verifyEmail.ejs` | `signup.service.js` (`Verify your email address`) | `name`, `verificationUrl`, `tokenExpiry` |
| `forgotPassword.ejs` | `forgotPassword.service.js` (`Reset your password`) | `name`, `resetUrl`, `tokenExpiry` |

```js
const html = await ejs.renderFile(
    path.join(process.cwd(), 'src/views/emailTemplates/verifyEmail.ejs'),
    { name, verificationUrl, tokenExpiry: '30 minutes' }
);
```

Templates are located relative to `process.cwd()`, so the service must be
started from the project root (the Docker image does this).

## Conventions

- Print values with `<%= %>`, which HTML-escapes them. Do not use `<%- %>` for
  user-supplied values such as `name`.
- Email clients ignore most external CSS, so styles are inline and the layout is
  a single narrow column.
- Include the full link as visible text as well as a button, in case the button
  does not work.
- `tokenExpiry` is a human-readable string such as `15 minutes`, prepared by
  the service.
- Add a new template here, render it from the service that sends the email, and
  pass every variable it uses explicitly. Add the new row to the table above.
