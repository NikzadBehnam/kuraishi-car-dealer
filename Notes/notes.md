# Better Auth implementation checklist

## Goal and scope

Configure Better Auth for this Next.js App Router project, using the planned Prisma and Neon stack. Require a valid authenticated session before rendering the dashboard, disable public self-registration, and reserve account creation for one bootstrapped master admin. This is an implementation guide only; no authentication code or dependencies have been added.

UploadThing is a separate image/file-upload concern. It is not required to configure Better Auth and is outside this checklist.

### Current project state

- The project is a frontend prototype, not a working backend: it has no configured database, persistent users or sessions, authentication API, or upload provider.
- The login and registration forms are UI-only and do not create sessions or accounts: [login-form.tsx](<../src/app/(auth)/login/login-form.tsx>) and [register-form.tsx](<../src/app/(auth)/register/register-form.tsx>).
- The `(protected)` route-group name does not enforce access. The current [admin layout](<../src/app/(protected)/admin/layout.tsx>) renders the admin shell without checking a session.
- The current [proxy](../src/proxy.ts) handles locale routing only; it is not an authentication guard.
- Better Auth, Prisma, Neon, and UploadThing are not configured in the project yet. Treat Prisma and Neon setup as prerequisites for the persistent Better Auth database described below.

## Decisions captured from your update

- [x] **Account provisioning:** Public self-registration is disabled. Bootstrap one master admin through a trusted, one-time setup. Only that account may access the account-creation flow. Accounts it creates receive the regular `user` role and may use the full dashboard, but not account creation. The master admin may also use the dashboard.
- [x] **Email verification:** Not required. Do not add a verification-email dependency or block sign-in on email verification.
- [x] **Password reset:** No self-service password-reset flow for now. Account creation must establish an initial password securely; define an operational recovery path, such as the master admin resetting a regular user's password. Plan a separate recovery procedure for the master admin.
- [x] **Profile data:** Map first and last name to Better Auth's `name`. _Decided: phone is **not** stored on the auth user record, so no additional field is needed._ Keep password confirmation client-side only.
- [x] **Consent storage:** _Decided: consent does not need to be auditable, so nothing is persisted._
- [x] **Origins:** _Decided (Vercel deployment): trust only `http://localhost:3000` and `https://www.kuraishicars.com`; no preview-deployment origins._

The checklist interprets “registration” as creating additional accounts, not public sign-up. The existing registration page must become a master-admin-only account-creation flow or be replaced by one; it must not remain a public registration route.

## Implementation checklist

### 1. Pin a compatible stack and provision Neon

- [x] Use the repository's existing package manager and pin compatible versions of Better Auth, its Prisma adapter, Prisma ORM, and the Neon Prisma driver. Do not use floating `latest` versions for this security-sensitive integration. _Done with pnpm, exact versions: `better-auth` 1.7.23, `@better-auth/prisma-adapter` 1.7.23, `prisma` and `@prisma/client` 7.10.1, `@prisma/adapter-neon` 7.10.1, `@neondatabase/serverless` 1.2.1, `ws` 8.23.0, `@types/ws` 8.18.2._
- [ ] At the time this guide was prepared, Better Auth's Prisma adapter documentation covers Prisma ORM 7 and states Prisma 8 is not yet supported. Recheck the compatibility page before installing or upgrading.
- [x] Create a Neon project/database (prefer a separate development branch/database for local work). _Done: project `kuraishi-car-dealer-frankfurt` (id `twilight-bread-36837209`, org `Kuraishi`, `aws-eu-central-1`, Postgres 18), default branch `main` (`br-damp-shape-b9jjarf6`), development branch `dev` (`br-plain-surf-b9e05n7g`), database `kuraishi-car-dealer-db`. Local `.env.local` uses the `dev` branch with pooled `DATABASE_URL` and direct `DIRECT_URL`._ Keep the pooled runtime connection and direct migration connection distinct when following Neon’s Prisma setup.
- [x] Configure Prisma's PostgreSQL datasource and Prisma 7 CLI configuration as documented for the selected versions. Prisma 7's connection configuration differs from older examples that put the URL only in `schema.prisma`; follow the current Prisma/Neon guide. _Done: [prisma.config.ts](../prisma.config.ts) (migration URL from `DIRECT_URL`) and [schema.prisma](../prisma/schema.prisma). `prisma validate` passes and `prisma migrate status` connects to Neon._
- [~] Add local secrets to an ignored local environment file and production secrets to the deployment provider. Provide placeholder names only in any committed example file; never commit credentials. _Local part done: `.env.local` (git-ignored via new `.env*` rules) and committed placeholder `.env.example`. Production secrets still to add in the deployment provider._

### 2. Configure Prisma and the Better Auth database adapter

- [x] Initialize Prisma, define the PostgreSQL datasource, and create the Prisma client using the Neon-supported driver adapter for the chosen Prisma version. _Done: `prisma generate` outputs to `src/generated/prisma` (git-ignored, regenerated by the `postinstall` script); the client uses `@prisma/adapter-neon` with the pooled `DATABASE_URL`._
- [x] Create one server-only Prisma client module and reuse it; do not create a new database client per request. _Done: [db.ts](../src/lib/db.ts) imports `server-only` (pinned 0.0.1) and caches the client on `globalThis` in development. `typecheck` and `lint` pass._
- [x] Create a server-only Better Auth instance (for example, under `src/lib/`). Configure the Prisma adapter with the PostgreSQL provider, enable email/password sign-in, and set `emailAndPassword.disableSignUp` to `true` so users cannot self-register through the public sign-up endpoint. _Done in [auth.ts](../src/lib/auth.ts)._
- [x] Add Better Auth's Admin plugin for the privileged account-creation workflow. Keep exactly one master account in the `admin` role; the account-creation flow must always assign new accounts the regular `user` role and must not accept a role from the form. Do not expose role-promotion or other Admin plugin actions that are outside this account-creation requirement. _Done: [permissions.ts](../src/lib/permissions.ts) limits the `admin` role to `create`, `list`, `get` and `set-password`. There is no `set-role`, `ban`, `impersonate`, `delete` or `update`. Better Auth rejects any role in create-user without `set-role`, so new accounts always get `user`. The single-admin rule still depends on the bootstrap in section 3._
- [x] Configure email verification as not required. Do not add a verification-email sender or present verification as part of successful account creation. _Done: `requireEmailVerification: false`, no sender._
- [~] Do not add a public forgot-password flow or password-reset email sender. Define how the master admin will securely set a new password for a regular user and how the master admin account itself can be recovered. _No reset flow added. Regular users: the master admin uses `set-password`, which the role allows. Master-admin recovery procedure is still to be defined (section 3/5)._
- [x] Set `BETTER_AUTH_SECRET` to a cryptographically random secret of at least 32 characters and set `BETTER_AUTH_URL` to the canonical application origin. Fail clearly when required production configuration is missing; do not use a sample/default secret in production. _Done: auth.ts throws if either is missing, the secret is under 32 characters, or the production URL is not HTTPS. Local values are in `.env.local`; production values still have to be set in Vercel (`BETTER_AUTH_URL=https://www.kuraishicars.com` plus a different secret)._
- [x] Set `trustedOrigins` to the exact local, production, and intentionally supported preview origins. Keep CSRF/origin checks enabled; do not trust arbitrary request hosts or forwarded headers. _Done: `https://www.kuraishicars.com`, plus `http://localhost:3000` outside production. No previews._
- [x] Keep production auth on HTTPS and verify that session cookies are `HttpOnly` and `Secure`. Avoid custom cross-subdomain cookie settings unless the deployment requires them. _Configured: `useSecureCookies` in production, no cross-subdomain cookies. Verifying the real cookie flags in the deployment remains in section 7._
- [x] Start with Better Auth's database-backed sessions and documented defaults. Do not add cookie caching or stateless sessions without a specific requirement and an explicit review of revocation/session invalidation behavior. _Done: defaults, no cookie cache._
- [x] Review Better Auth's rate-limit defaults and configure storage appropriate for the deployment. In a multi-instance/serverless deployment, do not assume in-memory counters are shared; configure trusted client-IP headers/proxies only to match the actual hosting network. _Done: `storage: "database"` (needs a `rateLimit` model in section 3) and, in production, only `x-vercel-forwarded-for` is trusted for the client IP._

### 3. Generate and migrate the auth schema

- [x] Finalize the Better Auth configuration, including the Admin plugin and any additional user fields, before schema generation, because these choices can change the required database schema. _Done in section 2; no additional user fields._
- [x] Use the Better Auth CLI schema-generation command for the pinned Better Auth version to add the required Better Auth models to the Prisma schema. Review the generated diff and reconcile it with existing models instead of blindly overwriting project schema. _Done: `pnpm dlx auth@1.7.23 generate --config src/lib/auth.ts --output prisma/schema.prisma`. The CLI cannot load `server-only`, so those imports were removed temporarily and restored. Models: `user`, `session`, `account`, `verification`, `rateLimit`; the generator and datasource blocks were kept._
- [x] Apply the generated schema with Prisma's migration workflow: create/apply a development migration, then generate the Prisma client. Better Auth's `migrate` command is for its built-in Kysely adapter; for the Prisma adapter, use generated Prisma schema plus Prisma migrations. _Done: migration `20261113214441_init_better_auth` applied to the Neon `dev` branch._
- [x] Verify the resulting schema and migration status locally before connecting the application to a production Neon database. Deploy production migrations through the production migration workflow, not `migrate dev`. _Verified: `prisma migrate status` is up to date and the tables exist on `dev`. Production (`main` branch) is untouched; deploy there with `prisma migrate deploy`._
- [ ] After the schema is applied, create the single master admin through Better Auth's documented `create-admin` CLI workflow (or an equivalent controlled one-time bootstrap). Do not create a plaintext password record or expose bootstrap through a public route. Confirm that no other account has the `admin` role.

### 4. Add the Next.js server and client integrations

- [ ] Add the App Router catch-all handler at `src/app/api/auth/[...all]/route.ts`, exporting the Better Auth Next.js handler for `GET` and `POST`.
- [ ] Preserve the current locale behavior in `src/proxy.ts`. Ensure `/api` remains excluded from locale rewrites, and do not make proxy cookie checks the sole access-control mechanism.
- [ ] Create the browser auth client in a separate client-safe module using Better Auth's React client. Keep database and secret-bearing configuration in server-only modules.
- [ ] Add the Admin client plugin only if the account-creation UI calls Admin plugin endpoints from the browser. Regardless of client setup, rely on Better Auth's server-side admin authorization and verify the master-admin role on the protected account-creation page/action.
- [ ] Use the session hook/client state only for UX (for example, showing a user name or hiding a sign-in button). Client-side state is not a security boundary.

### 5. Connect the existing forms to real authentication

- [ ] Replace the login form's UI-only delay/toast with Better Auth email sign-in. Send the email and password, map the “remember me” choice to the supported session option, display actual errors, and navigate only after a successful response.
- [ ] Remove public sign-up behavior from the registration form. Convert it to a master-admin-only account-creation screen, or replace it with a user-management screen that creates accounts through Better Auth's Admin plugin. Guard both its page and its server action/API with a server-validated admin session.
- [ ] Create each account through the privileged Admin plugin create-user operation, explicitly assigning the `user` role. Map first and last name to `name`; send only fields supported by the configured user schema. Do not send confirmation password or a client-selected role as auth fields.
- [ ] Decide how the master admin securely provides each new user with an initial password. Since self-service reset is out of scope, document how regular users request a password change from the master admin and how the master admin account is recovered.
- [ ] Implement sign-out through Better Auth and update the UI after the session is cleared.
- [ ] Do not show a public sign-up, verification-email, or forgot-password flow. Email verification and self-service password reset are explicitly out of scope for now.
- [ ] Keep loading, duplicate-submit prevention, and server-returned error messages explicit. Remove all success-shaped UI behavior that can occur without a successful server response.

### 6. Enforce the dashboard session boundary on the server

- [ ] Update the admin layout so it obtains the current request headers and calls Better Auth's server API to validate the session before rendering `AdminShell`. Redirect users with no valid session to the login page.
- [ ] Use the server-validated session on every request. Do not treat the presence of a cookie alone as proof of authentication; it may be expired, invalid, or revoked.
- [ ] Ensure every dashboard route is nested under the guarded admin layout. Keep login public. Do not keep account registration public; put account creation under a master-admin-guarded route.
- [ ] If redirecting back to the requested page after login, accept only safe local paths; do not allow an untrusted external redirect target.
- [ ] Protect future Server Actions, Route Handlers, and backend data operations independently by checking the session at the server boundary. A protected layout does not secure an unguarded API or mutation endpoint.
- [ ] Apply one role exception to the dashboard's signed-in-user gate: only the master admin may access account creation. All other authenticated users may access the rest of the dashboard; they must be denied the account-creation page and its underlying action/API even when called directly.
- [ ] Keep role assignment out of the account-creation UI. Always assign new accounts the `user` role; do not provide a role-promotion workflow or allow regular users to update their own role.

### 7. Verify behavior and deployment

- [ ] Anonymous visit to `/admin` and a nested admin URL redirects to login without rendering protected content.
- [ ] A valid regular user can open every ordinary dashboard area, refresh, and navigate between admin routes; the session remains valid according to the configured session policy.
- [ ] A regular user cannot access the account-creation page or invoke its action/Admin endpoint directly. The master admin can access that workflow and create a regular user.
- [ ] Accounts created by the master admin receive only the `user` role. Verify that neither the form payload nor a direct request can assign the `admin` role.
- [ ] Anonymous public sign-up is rejected by the server even when the sign-up API is called directly; hiding the registration link alone is not sufficient.
- [ ] Sign-out, expired sessions, invalid/tampered cookies, and revoked sessions do not render protected pages.
- [ ] Email verification and public password reset are absent as planned. Verify the documented master-admin recovery process for regular accounts.
- [ ] Auth API requests work without locale rewriting. Requests from untrusted origins are rejected, and legitimate local/production origins work.
- [ ] Test failed database/auth requests and confirm they fail closed: an auth/database error must not render the dashboard as if the user were signed in.
- [ ] Check session behavior in the target deployment, including HTTPS cookie flags, origin configuration, environment variables, and applied database migrations.
- [ ] Add focused tests for anonymous, regular-user, and master-admin access to dashboard and account-creation routes/actions. Run the existing type-check, lint, and production build after implementation.

## Authentication versus authorization

The access policy is **authentication plus one authorization exception**. Any valid account created by the master admin may access the full dashboard. Only the single master admin may create accounts; regular users must not access that function. Public self-registration is disabled, so the first master admin must be bootstrapped through a trusted setup and additional accounts must be created through the protected workflow. Do not add role restrictions to other dashboard features unless the product requirement changes.

## Official documentation

Use the versioned/current docs for the pinned dependencies during implementation; Better Auth and Prisma configuration details can change between major releases.

- [Better Auth installation](https://www.better-auth.com/docs/installation)
- [Better Auth with Next.js](https://www.better-auth.com/docs/integrations/next-js)
- [Better Auth Prisma adapter](https://www.better-auth.com/docs/adapters/prisma)
- [Better Auth database concepts](https://www.better-auth.com/docs/concepts/database)
- [Better Auth sessions](https://www.better-auth.com/docs/concepts/session-management)
- [Better Auth email and password](https://www.better-auth.com/docs/authentication/email-password)
- [Better Auth email/password options](https://www.better-auth.com/docs/reference/options#emailandpassword)
- [Better Auth configuration options](https://www.better-auth.com/docs/reference/options)
- [Better Auth cookies](https://www.better-auth.com/docs/concepts/cookies)
- [Better Auth rate limiting](https://www.better-auth.com/docs/concepts/rate-limit)
- [Better Auth CLI](https://www.better-auth.com/docs/concepts/cli)
- [Better Auth Admin plugin](https://www.better-auth.com/docs/plugins/admin)
- [Prisma ORM with Neon](https://www.prisma.io/docs/orm/overview/databases/neon)
