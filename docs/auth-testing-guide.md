# Kuraishi Better Auth Testing Guide

This guide validates the Better Auth implementation in this repository. It is adapted to the actual Kuraishi Car Dealer routes, files, schema, and configuration.

Use this order because later tests depend on accounts created earlier:

1. Registration
2. Email verification
3. Credential login and session persistence
4. Logout
5. Forgot/reset password
6. Google authentication
7. Roles and `/admin` authorization
8. Production smoke test

## Implementation Reference

Core auth files:

- `src/lib/auth/server.ts` creates the server-side Better Auth instance.
- `src/lib/auth/options.ts` configures email/password, email verification, Google, sessions, trusted origins, admin plugin, and hooks.
- `src/app/api/auth/[...all]/route.ts` mounts Better Auth at `/api/auth/[...all]` with `runtime = "nodejs"`.
- `src/lib/auth-client.ts` creates the browser Better Auth client from `better-auth/react`.
- `src/lib/prisma.ts` creates the Prisma 7 runtime client with `@prisma/adapter-pg`.
- `prisma/schema.prisma` defines the Better Auth tables and Kuraishi-specific user fields.
- `src/app/(protected)/admin/layout.tsx` protects the whole `/admin` route tree server-side.
- `src/lib/auth/authorization.ts` and `src/lib/auth/admin-route-policy.ts` contain server authorization helpers.
- `scripts/seed-first-admin.ts` creates the first `ADMIN` account.

Auth routes:

| Purpose               | Route                          |
| --------------------- | ------------------------------ |
| Login                 | `/login`                       |
| Register              | `/register`                    |
| Forgot password       | `/forgot-password`             |
| Reset password        | `/reset-password?token=...`    |
| Verification pending  | `/verify-email?email=...`      |
| Verification callback | `/verify-email/callback?...`   |
| Better Auth API       | `/api/auth/[...all]`           |
| Admin area            | `/admin` and nested `/admin/*` |

Confirmed configuration:

- Public email/password signup is enabled.
- Email verification is required before credential login.
- Public credential signup does not auto-sign-in.
- Public users are forced to role `CUSTOMER`.
- Roles are `ADMIN`, `STAFF`, and `CUSTOMER`.
- Only `ADMIN` is configured as an admin role.
- Google is the only social provider.
- Google sign-in does not request extra scopes in the client.
- Password reset tokens expire after 1 hour.
- Password reset revokes existing sessions.
- Sessions expire after 30 days, with a 1-day update age and 1-day fresh age.
- Better Auth verification identifiers are stored hashed.
- Cookie prefix is `kuraishi-auth`.
- Trusted origins are `http://localhost:3000` in development and `https://kuraishi-car-dealer.vercel.app` in production.

## 1. Prepare The Test Environment

Use Node 24, matching `package.json`.

```powershell
node -v
pnpm -v
pnpm prisma:validate
pnpm prisma:generate
pnpm exec prisma migrate status
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

On this Windows machine, if `pnpm` reports Node `v14.21.3`, switch the shell to Node 24 before testing. The project itself requires Node `24.x`.

Confirm local environment variables exist in `.env` and are never pasted into tickets or chat:

- `DATABASE_URL`: Neon pooled runtime URL, hostname includes `-pooler`.
- `DIRECT_URL`: Neon direct URL for migrations, hostname does not include `-pooler`.
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL=http://localhost:3000`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_FIRST_NAME`
- `SEED_ADMIN_LAST_NAME`
- `SEED_ADMIN_PASSWORD`

Prepare these accounts:

| Account              | Purpose                           |
| -------------------- | --------------------------------- |
| Fresh email inbox    | Registration and verification     |
| Existing `CUSTOMER`  | Customer auth and `/admin` denial |
| Existing `STAFF`     | Staff `/admin` denial             |
| Existing `ADMIN`     | Admin access                      |
| Fresh Google account | Google new-user flow              |
| Nonexistent email    | Forgot-password enumeration test  |

Use a private browser window and keep DevTools Network, Application, and Console tabs open. Do not copy cookie values, tokens, passwords, API keys, or database URLs into test notes.

Record each result:

```text
Test:
Environment:
Account:
Expected result:
Actual result:
Status: PASS / FAIL
Screenshot or sanitized error:
```

## 2. Public Smoke Tests

Open and refresh these pages:

- `/`
- `/login`
- `/register`
- `/forgot-password`
- `/verify-email`

Expected:

- Pages render without server errors.
- Login, registration, forgot-password, and verification-pending UI use the existing Kuraishi auth shell.
- There are no hydration errors.
- Initial page load does not expose secrets or tokens.
- `/api/auth/[...all]` is not bundled into client code.

Run an intentionally invalid login from `/login`.

Expected:

- The request reaches `/api/auth/sign-in/email`.
- The response is an auth error, not `404` or an unhandled `500`.
- No password, token, secret, or connection string appears in the response.

## 3. Registration Validation

The registration form is implemented in `src/app/(auth)/register/register-form.tsx`. Client validation is backed by `registerSchema` in `src/app/(auth)/_schemas/auth.schema.ts`. Server-side signup cleanup and consent enforcement happen in `src/lib/auth/signup-policy.ts` through the Better Auth `before` hook in `src/lib/auth/options.ts`.

### 3.1 Empty Submission

Open `/register`, leave all fields empty, and submit.

Expected:

- Submission is blocked.
- Required-field messages appear for first name, last name, email, password, password confirmation, and consent.
- No network request creates a user.
- No role, ban, verification, or admin field is shown in the UI.

### 3.2 Invalid Email

Enter otherwise valid fields and use `wrong-email`.

Expected:

- `Enter a valid email address.` appears.
- No account is created.

### 3.3 Phone Field

Submit with:

```text
abc123
123
+43 664 123 45 67
```

Expected:

- Phone is optional in the current schema.
- The client currently does not enforce a strict phone format.
- If provided, the server trims and stores the value.
- Empty phone is removed from the signup payload so Google users and credential users without phone remain valid.

### 3.4 Password Policy

Test short and mismatched values.

Expected:

- Current client policy requires at least 8 characters.
- Registration and reset password use the same minimum-length rule.
- Password confirmation must match.

### 3.5 Consent

Complete the form but leave consent unchecked.

Expected:

- Client validation blocks submission.
- A direct request to Better Auth `/api/auth/sign-up/email` without `consent: true` is rejected server-side.
- Consent is stored as `termsAcceptedAt` and `termsVersion`, not as a mutable boolean.
- Current terms version is defined in `src/lib/auth/signup-policy.ts`.

### 3.6 Privileged Field Injection

Use DevTools or an API client to add fields such as:

```json
{
  "role": "ADMIN",
  "emailVerified": true,
  "banned": true,
  "termsAcceptedAt": "2000-01-01T00:00:00.000Z"
}
```

Expected:

- Server signup policy strips those fields.
- The created user is still `CUSTOMER`.
- `emailVerified` remains false until the verification flow succeeds.
- `termsAcceptedAt` is set by the server at request time.

## 4. Successful Credential Registration

Use a fresh email address.

1. Open `/register`.
2. Fill first name, last name, email, optional phone, password, confirmation, and consent.
3. Submit once, then attempt repeated clicks during loading.
4. Inspect the network request and response.
5. Confirm the app redirects or presents the pending verification flow at `/verify-email`.

Expected:

- Submit button is disabled while pending.
- Browser payload includes `firstName`, `lastName`, composed `name`, `email`, optional `phone`, `password`, and `consent`.
- Browser payload does not include role, ban fields, `emailVerified`, `termsAcceptedAt`, or `termsVersion`.
- Better Auth creates a credential account.
- The new user has role `CUSTOMER`.
- The user is not signed in before email verification.
- Verification email is sent through Resend.
- No password appears in URL, toast, response body, or logs.

Optional database checks:

- `user.email` is normalized consistently.
- `user.role` is `CUSTOMER`.
- `user.emailVerified` is false.
- `user.termsAcceptedAt` is populated.
- `user.termsVersion` is populated.
- `account.providerId` is the credential provider.
- Credential password is stored only as an account hash, never plaintext.

## 5. Duplicate Registration

Register the same address again using lowercase and uppercase variants.

Expected:

- No duplicate user is created because `User.email` is unique.
- UI displays a safe error.
- No `500` or stack trace appears.
- The response does not reveal more than necessary about account state.

## 6. Unverified Credential Login

Before clicking the verification email:

1. Open `/login`.
2. Enter the new email/password.
3. Submit with Remember this device either checked or unchecked.

Expected:

- Login is rejected with the project message: `Please verify your email address before logging in.`
- No authenticated session is created.
- The UI offers a path to resend verification.
- `/admin` remains inaccessible.

## 7. Email Verification

### 7.1 Valid Link

Open the latest verification email.

Expected:

- Sender matches `RESEND_FROM_EMAIL`.
- Branding says Kuraishi Autohandel.
- Link points to `http://localhost:3000` locally or `https://kuraishi-car-dealer.vercel.app` in production.
- Verification succeeds through Better Auth.
- `/verify-email/callback` shows success handling.
- Credential login works afterward.
- Database has `emailVerified = true`.

### 7.2 Reused, Modified, Or Expired Link

Open the same link again, edit the token, and test an expired token when possible.

Expected:

- Verification is rejected safely.
- No session is created.
- The UI does not reveal token internals.
- No stack trace appears.

### 7.3 Resend Verification

Use `/verify-email?email=test@example.com` for an unverified account and request another email several times.

Expected:

- The response remains neutral.
- Better Auth rate limiting or controlled endpoint behavior prevents abuse.
- Newest valid link works.
- Token values are not logged.

## 8. Credential Login

The login flow maps through `src/app/(auth)/login/login-flow.ts`.

### 8.1 Correct Credentials

Log in with a verified customer.

Expected:

- Email is trimmed and lowercased before submission.
- Password is submitted only to Better Auth.
- `rememberMe` matches the form checkbox.
- Login redirects to a safe callback path or `/`.
- Header state changes through `authClient.useSession()`.
- Refresh preserves the authenticated state while the session is valid.

### 8.2 Wrong Password And Nonexistent Email

Try a wrong password and a nonexistent account.

Expected:

- Both show the same general message: `We could not sign you in. Check your email and password.`
- No session cookie is created.
- No account-existence details leak.

### 8.3 Callback URL Safety

Open:

```text
/login?callbackURL=/favourites?from=login
/login?callbackURL=/admin
/login?callbackURL=https://malicious-example.com
/login?callbackURL=//malicious-example.com
/login?callbackURL=/api/auth/get-session
```

Expected:

- Safe internal paths are preserved.
- External, protocol-relative, backslash-containing, control-character, `/login`, and `/api/auth/*` callback URLs fall back to `/`.
- The app never redirects to another domain.

## 9. Remember This Device

### 9.1 Remember Disabled

Log in with Remember this device unchecked.

Expected:

- `rememberMe` is false in the sign-in request.
- Cookie persistence follows Better Auth's non-remembered session behavior.
- Closing/reopening the browser behaves accordingly.

### 9.2 Remember Enabled

Log in with Remember this device checked.

Expected:

- `rememberMe` is true in the sign-in request.
- Cookie expiry is longer than the unchecked case.
- Session is still revocable by logout and password reset.
- Do not copy cookie values into test reports.

## 10. Logout

Logout is exposed in `src/components/layout/site-header.tsx`.

1. Log in.
2. Refresh.
3. Use the header logout action.
4. Refresh again.
5. Use browser Back.
6. Try `/admin`.

Expected:

- Better Auth `signOut` is called.
- Header returns to logged-out state.
- Session is no longer valid after refresh.
- Browser history does not expose protected admin content.
- `/admin` redirects to `/login?callbackURL=/admin` for anonymous users.

## 11. Forgot Password

The forgot-password flow uses `src/app/(auth)/forgot-password/forgot-password-form.tsx` and `src/app/(auth)/forgot-password/password-recovery-flow.ts`.

### 11.1 Existing Account

Open `/forgot-password`, submit a registered email.

Expected:

- UI shows: `If an account can be reset, a password reset link will arrive shortly.`
- Reset email is sent through Resend.
- Link points to `/reset-password?token=...`.
- Token is not shown in logs or copied into bug reports.

### 11.2 Nonexistent Account

Submit an unregistered email.

Expected:

- Same neutral UI message.
- No account-missing disclosure.
- No unhandled server error.

### 11.3 Repeated Requests

Submit repeatedly on a slow network.

Expected:

- Loading state prevents duplicate UI submissions.
- Better Auth rate limiting or endpoint behavior controls abuse.
- Provider errors are sanitized.

## 12. Reset Password

### 12.1 Valid Reset

Open the latest reset email, submit matching valid passwords, then test old and new passwords.

Expected:

- Reset succeeds.
- Old password no longer works.
- New password works.
- Existing sessions are revoked because `revokeSessionsOnPasswordReset` is true.
- User lands on `/login?passwordReset=success`.

### 12.2 Invalid Cases

Test mismatched passwords, missing token, modified token, expired token, and reused token.

Expected:

- Mismatched passwords are blocked client-side.
- Missing token shows the reset page invalid state.
- Invalid, expired, and used tokens share the same safe message.
- No token value, stack trace, or account state appears in UI/logs.

## 13. Google Authentication

The shared Google button lives in `src/app/(auth)/_components/google-auth-button.tsx`. Request construction lives in `src/app/(auth)/_components/google-auth-flow.ts`.

### 13.1 New Google Customer

Use a Google email not already registered.

Expected:

- Client calls `authClient.signIn.social` with provider `google`.
- No custom scopes are requested by the Kuraishi client.
- Google returns to `/api/auth/callback/google`.
- New user receives role `CUSTOMER`.
- Google `given_name` and `family_name` map to `firstName` and `lastName` when provided.
- Missing phone does not fail because `phone` is nullable.

### 13.2 Existing Credential Email

Try Google sign-in with an email already used by a credential account.

Expected:

- Account linking follows Better Auth config:
  - linking is enabled;
  - different emails are not allowed;
  - user info is not overwritten on link;
  - all account methods cannot be unlinked;
  - OAuth tokens are encrypted.
- The user's role is not changed by Google sign-in.
- No duplicate user is silently created.

### 13.3 Cancel Or OAuth Error

Start Google sign-in and cancel.

Expected:

- User returns safely.
- No incomplete authenticated session remains.
- UI shows a neutral or helpful error.

### 13.4 Redirect URI Checklist

Google Cloud OAuth must include:

```text
http://localhost:3000/api/auth/callback/google
https://kuraishi-car-dealer.vercel.app/api/auth/callback/google
```

Authorized JavaScript origins:

```text
http://localhost:3000
https://kuraishi-car-dealer.vercel.app
```

For `redirect_uri_mismatch`, compare the exact scheme, host, path, and port in the Google error page against the configured callback. Do not share the client secret.

## 14. Role And Admin Authorization

This section verifies the real security rule for the project:

- `ADMIN` can open `/admin`.
- `CUSTOMER` and `STAFF` can sign in, but cannot open `/admin`.
- Logged-out visitors are sent to login with a safe return path.
- The server layout is the security boundary; hiding links in the UI is not enough.

Google authentication can be skipped for this section. Use credential accounts.

### 14.1 Prepare The Test Accounts

Create or prepare three separate accounts:

| Test account | How to prepare it                                                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ADMIN`      | Use `pnpm seed:first-admin` with the local seed environment variables. Do not paste the password into chat or screenshots.                        |
| `CUSTOMER`   | Register normally through `/register`, then verify the email so credential login works.                                                           |
| `STAFF`      | Register a second normal account, verify it, then change only its `user.role` value to `STAFF` through trusted dev DB code or the Neon dashboard. |

For local manual testing only, if email delivery is still being debugged, you may mark a test credential account as verified in the development database by setting `user.emailVerified = true`. Do not use that shortcut as proof that the email verification flow works.

Before testing, confirm in the development database:

| Account    | Expected `user.role` | Expected `user.emailVerified` |
| ---------- | -------------------- | ----------------------------- |
| `ADMIN`    | `ADMIN`              | `true`                        |
| `CUSTOMER` | `CUSTOMER`           | `true`                        |
| `STAFF`    | `STAFF`              | `true`                        |

Important:

- Use different email addresses for the three accounts.
- Keep the role values uppercase: `ADMIN`, `STAFF`, `CUSTOMER`.
- The admin UI's "Change role" controls are currently UI-only and must not be used for this test.
- Restart the local server after changing environment variables, but database role changes only require signing out and signing back in.

### 14.2 Test Logged-Out Access

1. Open an incognito/private browser window, or log out completely.
2. Open `http://localhost:3000/admin`.
3. Check the final URL.
4. Repeat with a nested route: `http://localhost:3000/admin/users`.

Expected:

- `/admin` redirects to `/login?callbackURL=%2Fadmin`.
- `/admin/users` redirects to `/login?callbackURL=%2Fadmin%2Fusers`.
- The callback URL is a local path, not a full external URL.
- No admin dashboard content appears before the login page.

Also test an unsafe callback manually:

```text
http://localhost:3000/login?callbackURL=https://example.com/admin
```

Expected:

- After login, the app must not redirect to `https://example.com`.
- Unsafe external callback URLs fall back to a safe local route.

### 14.3 Test CUSTOMER Access

1. Log in at `/login` with the verified `CUSTOMER` account.
2. Open `http://localhost:3000/admin`.
3. Open `http://localhost:3000/admin/users`.
4. Refresh each page directly from the browser address bar.

Expected:

- The page shows `Administrator access required`.
- The admin shell, dashboard cards, user table, vehicle table, and sidebar do not appear.
- Refreshing or opening the URL in a new tab does not bypass the block.
- The user remains signed in as `CUSTOMER`; they are not treated as logged out.

### 14.4 Test STAFF Access

1. Log out from the `CUSTOMER` account.
2. Log in with the verified `STAFF` account.
3. Open `http://localhost:3000/admin`.
4. Open `http://localhost:3000/admin/users`.
5. Refresh each page directly.

Expected:

- The result is the same as `CUSTOMER`: `Administrator access required`.
- `STAFF` does not receive partial admin access.
- No protected admin content appears briefly during loading.

### 14.5 Test ADMIN Access

1. Log out from the `STAFF` account.
2. Log in with the seeded `ADMIN` account.
3. Open `http://localhost:3000/admin`.
4. Open these nested admin routes:
   - `http://localhost:3000/admin/users`
   - `http://localhost:3000/admin/vehicles`
   - `http://localhost:3000/admin/activity`
5. Refresh each route directly.

Expected:

- The admin shell loads.
- Nested admin routes load inside the admin shell.
- The browser stays on the requested `/admin/*` route.
- No unauthorized page appears for the `ADMIN` account.

### 14.6 Result Matrix

| User state | `/admin` expected result                  | Nested `/admin/*` expected result            |
| ---------- | ----------------------------------------- | -------------------------------------------- |
| Logged out | Redirect to `/login?callbackURL=%2Fadmin` | Redirect to login with encoded safe callback |
| `CUSTOMER` | `Administrator access required` page      | `Administrator access required` page         |
| `STAFF`    | `Administrator access required` page      | `Administrator access required` page         |
| `ADMIN`    | Admin shell loads                         | Nested admin route loads                     |

Implementation checks:

- Authorization is enforced in `src/app/(protected)/admin/layout.tsx`.
- `src/proxy.ts` only forwards the requested admin path in a header so redirects can preserve a safe callback path.
- Proxy is not the security boundary.
- Server helpers in `src/lib/auth/authorization.ts` validate the real Better Auth session and role.
- `CUSTOMER` and `STAFF` do not briefly see protected content.
- Hiding admin navigation is not treated as authorization.
- Direct refresh and new-tab access do not bypass checks.

## 15. Direct Server Boundary Checks

The current admin pages are UI screens backed by static/mock data. There are no current admin route handlers or server actions that mutate sensitive data.

Still, run the existing server-boundary test because it verifies the shared authorization policy:

```powershell
pnpm test
```

Expected:

- The `admin-route-policy` test suite passes.
- The suite covers anonymous, `CUSTOMER`, `STAFF`, and `ADMIN` outcomes.
- The suite covers safe admin callback paths.
- The suite confirms direct server-entry denial for non-admin sessions.

For any future admin route handler or server action:

- Import `requireAdmin` from `src/lib/auth/authorization.ts`.
- Call it inside the route handler or server action before reading or mutating data.
- Test anonymous, `CUSTOMER`, `STAFF`, and `ADMIN` access directly, not only through navigation.

Expected for future server entry points:

- Anonymous calls fail before reading or mutating data.
- `CUSTOMER` calls fail before reading or mutating data.
- `STAFF` calls fail before reading or mutating data.
- `ADMIN` calls succeed only for the intended operation.
- No protected data appears in the response body for rejected calls.

## 16. First Admin Seed

The seed script is `scripts/seed-first-admin.ts`.

Local run:

```powershell
pnpm seed:first-admin
```

Expected:

- Reads only `SEED_ADMIN_EMAIL`, `SEED_ADMIN_FIRST_NAME`, `SEED_ADMIN_LAST_NAME`, and `SEED_ADMIN_PASSWORD`.
- Does not print the password.
- Enforces a strong seed password.
- Creates the credential account through Better Auth APIs.
- Marks email verified through trusted server code.
- Assigns `ADMIN`.
- Re-running is idempotent.
- Existing non-admin conflicts are refused instead of overwritten.

Do not run this against production until production environment variables and target database are explicitly confirmed.

## 17. Session Security

### 17.1 Multiple Sessions And Password Reset

1. Log in in Browser A.
2. Log in in Browser B or incognito.
3. Reset the password.
4. Refresh both sessions.

Expected:

- Existing sessions are revoked after reset.
- Old password fails.
- New password succeeds.

### 17.2 Role Change

1. Log in as `CUSTOMER`.
2. Change role to `ADMIN` through trusted server/database code.
3. Refresh `/admin`.
4. Change role back.
5. Refresh `/admin`.

Expected:

- Server authorization uses current trusted session/user role.
- Client-side state alone cannot grant admin access.
- Removing `ADMIN` removes access.

### 17.3 Banned Users

The schema includes Better Auth admin-plugin ban fields: `banned`, `banReason`, and `banExpires`.

Expected:

- Banned-user behavior should match Better Auth admin-plugin semantics.
- Public signup cannot set ban fields.
- Ban state is not duplicated by a separate application status field.

## 18. UI And Accessibility

Test these auth pages on desktop and mobile:

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password?token=invalid`
- `/verify-email`
- `/verify-email/callback?error=invalid`
- `/admin` as unauthorized users

Expected:

- Labels are connected to fields.
- Keyboard tab order is logical.
- Focus indicators are visible.
- Errors are associated with fields.
- Buttons expose loading and disabled states.
- Password visibility buttons have accessible names.
- Toasts are not the only source of essential information.
- Long email addresses do not break layouts.
- Pages do not horizontally overflow.
- Forms do not submit twice.
- Errors are understandable without exposing internals.

## 19. Production Smoke Test

Before testing production, confirm these external settings:

- Vercel environment variables are configured without `NEXT_PUBLIC_` for secrets.
- `BETTER_AUTH_URL=https://kuraishi-car-dealer.vercel.app`.
- Neon production `DATABASE_URL` is pooled and `DIRECT_URL` is direct.
- `pnpm prisma:migrate:deploy` has been run against production intentionally.
- Resend sender uses a verified domain that you own, not the Vercel subdomain.
- Google OAuth has production origin and callback configured.

Production test:

1. Open `https://kuraishi-car-dealer.vercel.app/login`.
2. Register a fresh credential user.
3. Verify email from the production email.
4. Log in and log out.
5. Request and complete password reset.
6. Test Google login.
7. Test `/admin` as anonymous, `CUSTOMER`, `STAFF`, and `ADMIN`.
8. Review Vercel logs without printing secrets.

Expected:

- Emails contain production HTTPS links.
- Google callback uses the production domain.
- Cookies are secure in production.
- Neon connections remain stable.
- No localhost URLs appear in production emails or redirects.
- No auth endpoint returns an unexpected `500`.
- Server environment variables are not exposed to the browser.

## 20. Final Acceptance Checklist

- [ ] `pnpm prisma:validate` passes.
- [ ] `pnpm prisma:generate` passes.
- [ ] `pnpm exec prisma migrate status` reports the expected database state.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm lint` passes.
- [ ] `pnpm test` passes.
- [ ] `pnpm build` passes.
- [ ] Public registration works.
- [ ] New public credential users always receive `CUSTOMER`.
- [ ] Public Google users always receive `CUSTOMER`.
- [ ] Consent is enforced server-side for credential signup.
- [ ] Credential login requires email verification.
- [ ] Verification resend works safely.
- [ ] Credential login works after verification.
- [ ] Remember this device changes session persistence as expected.
- [ ] Logout invalidates the session.
- [ ] Forgot password uses neutral messaging for existing and nonexistent emails.
- [ ] Reset tokens cannot be reused.
- [ ] Password reset revokes existing sessions.
- [ ] Google login works locally and in production.
- [ ] Google does not unexpectedly duplicate users.
- [ ] Anonymous users cannot access `/admin`.
- [ ] `CUSTOMER` cannot access `/admin`.
- [ ] `STAFF` cannot access `/admin`.
- [ ] `ADMIN` can access `/admin`.
- [ ] Future admin route handlers/server actions call `requireAdmin`.
- [ ] No password, secret, token, OAuth code, cookie value, or connection string appears in logs, URLs, screenshots, or bug reports.
- [ ] Mobile and keyboard interaction work.
- [ ] Production emails and OAuth callbacks use `https://kuraishi-car-dealer.vercel.app`.
- [ ] Browser console and Vercel logs have no unexpected auth errors.
