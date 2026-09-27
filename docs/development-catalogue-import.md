# Development Catalogue Import

The development catalogue import copies the existing mock vehicle inventory
and ordered image URLs into PostgreSQL. It is deterministic and idempotent:
stable fixture IDs are used for new records, while existing fixture stock
numbers and provider asset identifiers are updated in place. Existing
development-provider images are detached before the canonical positions are
reapplied, so rerunning the import also repairs reordered fixture images.

The import does not delete records and does not create Better Auth users,
leads, appointments, engagement records, or audit events.

## Safety guard

The script refuses to run when `NODE_ENV` or `VERCEL_ENV` is `production`. It
also requires an explicit one-run opt-in:

```powershell
$env:ALLOW_DEVELOPMENT_SEED="IMPORT_MOCK_CATALOG"
pnpm seed:development
Remove-Item Env:ALLOW_DEVELOPMENT_SEED
```

`DIRECT_URL` is preferred when present, with `DATABASE_URL` as the development
fallback. The connection string is never printed.

Run all pending migrations and generate Prisma Client before importing.
