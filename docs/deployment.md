# Deployment

This project deploys to Vercel with Next.js App Router, Better Auth, Prisma ORM 7, Neon PostgreSQL, Resend, and Google OAuth.

## Runtime

- Node.js: `24.x`, pinned in `package.json` for Vercel.
- Package manager: `pnpm@10.26.1`, pinned in `package.json`.
- Build command: `pnpm build`.
- The build script runs `pnpm prisma:generate` before `next build` so Prisma Client is generated in Vercel using the committed Prisma 7 schema.
- The Better Auth App Router handler exports `runtime = "nodejs"` because Prisma 7 uses the `@prisma/adapter-pg` driver adapter and cannot run in the Edge runtime.
- `src/proxy.ts` remains lightweight and does not import Prisma or Better Auth server code.

## Environment Variables

Set these in Vercel Project Settings for Production before deploying. Do not prefix secrets with `NEXT_PUBLIC_`.

### Public

- `NEXT_PUBLIC_SITE_URL`: use `https://kuraishi-car-dealer.vercel.app`.
- `NEXT_PUBLIC_MAP_PROVIDER_KEY`: optional public browser key only.
- `NEXT_PUBLIC_ANALYTICS_ID`: optional public analytics ID only.

### Server Only

- `DATABASE_URL`: Neon pooled runtime connection string. The host should include `-pooler` and SSL parameters required by Neon.
- `DIRECT_URL`: Neon direct connection string for Prisma CLI migrations. The host should not include `-pooler`.
- `BETTER_AUTH_SECRET`: strong Better Auth secret.
- `BETTER_AUTH_URL`: `https://kuraishi-car-dealer.vercel.app`.
- `RESEND_API_KEY`: Resend server API key.
- `RESEND_FROM_EMAIL`: sender at a verified custom Resend domain.
- `RESEND_REPLY_TO_EMAIL`: reply-to address.
- `GOOGLE_CLIENT_ID`: Google OAuth web client ID.
- `GOOGLE_CLIENT_SECRET`: Google OAuth web client secret.
- `SEED_ADMIN_EMAIL`: first-admin setup email for controlled one-off seeding.
- `SEED_ADMIN_FIRST_NAME`: first-admin first name.
- `SEED_ADMIN_LAST_NAME`: first-admin last name.
- `SEED_ADMIN_PASSWORD`: first-admin temporary password.

## Better Auth Production Values

- Base URL: `https://kuraishi-car-dealer.vercel.app`.
- Trusted origins in production: `https://kuraishi-car-dealer.vercel.app` only.
- Localhost is trusted only outside production.
- Auth API route: `https://kuraishi-car-dealer.vercel.app/api/auth/[...all]`.
- Google callback URL: `https://kuraishi-car-dealer.vercel.app/api/auth/callback/google`.
- Secure cookies are enabled when `BETTER_AUTH_URL` uses `https`.

## Google OAuth

Create or update a Google OAuth web client with:

- Authorized JavaScript origin: `https://kuraishi-car-dealer.vercel.app`
- Authorized redirect URI: `https://kuraishi-car-dealer.vercel.app/api/auth/callback/google`

For local development, also allow:

- Authorized JavaScript origin: `http://localhost:3000`
- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

The redirect URI must match exactly, including scheme, host, path, and trailing slash behavior.

## Resend

Resend must send from a domain you own and have verified in Resend. Do not use `kuraishi-car-dealer.vercel.app` as the sending domain because the Vercel subdomain is not an owned email-sending domain for this project.

Use a custom domain or subdomain, then set `RESEND_FROM_EMAIL` to an address at that verified domain.

## Prisma Migrations

Do not run `prisma migrate dev` in the Vercel build. Development migrations can reset or create migration history and are not appropriate for production deployments.

Use the committed migration history and deploy it with:

```bash
pnpm prisma:migrate:deploy
```

`prisma:migrate:deploy` reads `DIRECT_URL` through `prisma.config.ts`, applies pending migrations, does not perform drift detection, does not reset the database, and does not generate Prisma Client.

Recommended production sequence:

1. Set all Vercel production environment variables.
2. Run `pnpm prisma:migrate:deploy` from a protected CI job or controlled operator environment with production `DIRECT_URL`.
3. Deploy the application to Vercel with `pnpm build`.
4. Run `pnpm seed:first-admin` once in a controlled environment with production server-only variables loaded.
5. Sign in as the seeded admin and verify `/admin`.

## Rollback

If deployment fails before migrations run, redeploy the previous Vercel deployment.

If deployment fails after a migration has run, do not manually edit the production database. Ship a forward migration that restores compatibility, redeploy the last known-good application version if it still matches the migrated schema, or restore from a Neon backup/branch according to the database recovery plan.
