# Operations and recovery runbook

This runbook records the current recovery and operational boundaries. It does
not authorize Production changes, define a customer-data retention period, or
confirm that a backup schedule has been configured.

## Database backup and recovery

- Neon history-window duration and snapshot scheduling depend on the project
  plan and configuration. Verify both in the Neon Console; do not assume a
  retention window or scheduled backup is active.
- Before a separately approved risky schema or data operation, confirm that
  the target branch and recovery point are correct and create an approved
  recovery point if the project's plan permits it. The RPO, RTO, snapshot
  frequency, and retention period have not been approved or recorded.
- For a suspected data incident, use Neon's read-only Time Travel Assist to
  inspect historical data and identify a recovery point before requesting a
  restore. Do not restore a branch based only on an approximate incident time.
- Neon's point-in-time restore applies to root branches, overwrites all
  databases and schema on the selected branch, and temporarily interrupts
  connections. Neon creates a backup branch of the pre-restore state. A
  database restore does not restore or roll back object-storage contents.
  Obtain explicit approval before restoring any shared or Production branch.
- After an approved restore, validate the restored schema and records, auth
  access, and media references against the separate object-storage state.
  Preserve the pre-restore branch until the owner confirms recovery.

See Neon's current
[instant restore guide](https://neon.com/docs/postgres/backup-restore/branch-restore)
and [backup and restore guide](https://neon.com/docs/guides/backup-restore).
Plan-dependent history and snapshot settings must be confirmed in the Console.

## Media uploads and orphan cleanup

- Upload-intent creation opportunistically sweeps at most five expired intents.
  An administrator can request a bounded sweep through
  [`POST /api/admin/media/uploads/cleanup`](../src/app/api/admin/media/uploads/cleanup/route.ts);
  it processes at most 100 expired intents per request and returns scanned,
  cleaned, and failed counts.
- The cleanup removes an expired staging object and removes the final object
  only if no `MediaAsset` row references it. Completed assets are preserved.
  Per-item failures remain retryable and are logged without storage error
  details.
- Upload completion/cancellation can also report `cleanupPending`. Retry
  cleanup through the existing guarded flow; do not delete objects or rows
  manually to make the status look successful.
- The isolated 16.06 and 03.14 browser traces recorded aborted storage POST
  events even though uploads finalized and the stored images rendered. If it
  recurs, capture timestamps, HTTP status, finalization result, and whether
  the reopened image decodes. Do not retain signed URLs, form fields, or
  credentials in diagnostic evidence. Investigate failures separately from
  an aborted trace event with a verified successful upload.
- A follow-up isolated Chromium trace tied the same Fetch request to both
  an HTTP 204 response and a subsequent `net::ERR_ABORTED` event marked
  canceled. The browser Fetch returned 204 and finalization succeeded. The
  cause of the cancellation event is unresolved. Compare with another browser
  and a plain 204 control, then correlate with sanitized storage-side status
  or request timing before drawing a conclusion.
- Hosted Preview `192b842` reproduced the warning on two synthetic image
  POSTs. Both Fetch calls returned 204 and finalized; the replacement image
  decoded on the public detail page behind Vercel Authentication. The
  cancellation event remains unresolved.
- The 06.10 hosted retest reproduced it on two more synthetic image POSTs.
  Both returned 204, finalized, and rendered in the gallery. This is another
  observation, not a diagnosis; keep the browser/control/provider comparison open.
- There is no automatic time-based deletion for unused `MediaAsset` records
  and no bucket-wide orphan purge. An unused asset may have been intentionally
  finalized for later attachment. Review each candidate in the protected media
  library and its database/storage references before using its explicit delete
  action.
- Neon PITR does not roll back S3-compatible storage. Before any database
  recovery, separately verify the bucket provider's versioning/backup
  capabilities and coordinate recovery of database references with the
  corresponding media objects. No bucket versioning or backup schedule is
  confirmed here.

Implementation references:
[upload cleanup](../src/lib/media-uploads.ts) and
[media deletion](../src/lib/admin-media-deletions.ts).

## Preview search indexing

- Only Vercel Production builds opt into indexing. Local/test and Preview
  should send `X-Robots-Tag: noindex, nofollow`; `/robots.txt` should disallow
  all crawling without advertising a sitemap.
- These directives do not make a Preview private. Keep deployment protection
  enabled and verify it on both the generated deployment URL and branch alias.
  Before deploying, check the exact branch's effective Preview environment,
  including inherited values and overrides. Confirm isolated database and
  storage endpoints and credentials, a dedicated Preview auth secret and
  exact HTTPS Preview auth origin, and disabled inquiry delivery. Record only
  non-secret evidence. Hosted 15.09 verification passed on Preview `192b842`;
  see [report.md](./report.md).

## Inquiry notification reconciliation

- Inquiry acceptance is durable independently of notification delivery. The
  outbox uses bounded retries and idempotency keys; the protected inbox shows
  each notification's status and sanitized failure code.
- The worker endpoint is currently restricted to isolated test configuration
  and the Resend simulator. There is no Production sender, scheduler, or
  callback/webhook endpoint. Do not set test mode in Production or manually
  replay customer notifications.
- Task 10.07 passed with a disposable database, synthetic inquiries, and a
  fail-closed mock that did not contact Resend. Keep hosted Preview delivery
  disabled. Use an authenticated POST with no body for the local worker; an
  empty request stream is valid, but any actual body bytes are rejected.
  Investigate status and allowlisted error codes in the protected inbox.
  Never log or export customer data, provider bodies, or credentials.
  External simulator testing requires separate explicit authorization.
- A Production reconciliation procedure is not active. It requires a separate
  approved delivery configuration, legal approval, and an explicitly
  authorized scheduling/replay decision.

Implementation references:
[notification processing](../src/lib/inquiry-notification-delivery.ts),
[test-only worker route](../src/app/api/internal/inquiry-notifications/route.ts),
and [notification configuration](../src/lib/inquiry-email-config.ts).

## Customer-data retention and deletion

- No inquiry retention period, anonymization rule, or deletion schedule has
  been approved. Section 09.05 remains a legal/business gate; do not infer a
  period from database fields, deployment defaults, or this runbook.
- No automatic inquiry or note cleanup is configured. Do not add a TTL,
  anonymize, export, or delete customer records until the approved policy and
  authorized deletion procedure are recorded.
- Deleting an inquiry cascades its authored notes and notification outbox row.
  Deleting its associated vehicle only removes the live vehicle relation while
  retaining the inquiry's historical vehicle snapshots. These effects must be
  considered in any future approved deletion procedure.
- Section 16.06 uses synthetic records for non-Production verification. The
  customer enters real data after handoff. No real-data import or Production
  operation is authorized by this runbook.

### First-run dealership setup (16.06)

After migrations and staff-account provisioning, sign in and open **Admin →
Settings**. On a database with no dealership, complete the **Dealership** and
**Contact** tabs, then save. Reload Settings to confirm the saved values, and
make and reload a follow-up edit. If another session created the dealership
first, use **Reload latest settings** instead of submitting another creation.
Do not seed a placeholder dealership or expose the public site before the
customer completes setup. For release verification, use a fresh, isolated
database, isolated media storage, and synthetic records only.

For the full inventory suite, use a dedicated database with the existing
Better Auth baseline already applied and no dealership or vehicle fixtures.
The inventory migration test fingerprints the auth tables before it applies
the release migrations. Run the vehicle-media suite on a separate fresh,
fully migrated test database with no dealership; that suite creates its own.
Verify both targets before running either suite. Do not clear existing rows
to satisfy a test precondition.

## Dependency and cost monitoring

- `GET /api/health` returns only aggregate `200`/`503` status. It checks the
  database, both configured media buckets, and delivery configuration; it
  never sends email or calls the delivery provider. The route and server error
  reporter log no dependency credentials, request data, exception messages,
  or customer content.
- Each readiness request queries Neon and sends read-only bucket-head requests.
  Avoid high-frequency polling: it can wake an autoscaled Neon compute and
  increase database/storage traffic. This route is not a substitute for
  detailed dependency diagnostics.
- Review sanitized application logs for request/readiness event categories and
  inspect Neon usage, compute activity, history-window settings, and storage
  provider usage through their respective consoles. This work does not add an
  external monitoring platform, alert policy, or cost budget.
- Production monitoring, restore drills, and any alert thresholds require
  approval after the Production deployment and backup plan are established.

## Environment separation verification (16.11)

An authorized operator performs these read-only checks before any migration or
release. Do not export environment files, submit inquiries, send email, or
write to the database or buckets as part of this review.

1. In the approved [Vercel project](https://vercel.com/docs/environment-variables),
   open **Settings > Environment Variables**. Review Production and Preview
   separately, including any branch-specific overrides and linked shared
   variables. Record only pass/fail/unknown. Two entries with the same name do
   not prove that their values differ. When a value is write-only, confirm its
   target or provenance from trusted provisioning records. If that is not
   possible, mark it unknown and obtain separate approval before replacing it.
2. In the Neon Console, use the project's **Connect** dialog to identify the
   approved branch and database for each environment. Verify that
   `DATABASE_URL` is [pooled](https://neon.com/docs/connect/connection-pooling)
   (`-pooler` in the Neon hostname) and `DIRECT_URL` is direct (no `-pooler`).
   Within each environment both must target the same intended branch and
   database; Production and Preview must target different branches. Guarded
   test targets must not point at either live app database.
3. Confirm `BETTER_AUTH_SECRET` was generated separately for Production and
   Preview. Check that `BETTER_AUTH_URL` points to the exact intended HTTPS
   origin for each environment; Preview must not use the Production auth
   origin. For the release test branch, set a branch-specific
   `BETTER_AUTH_URL` to its stable Vercel Preview branch URL, without a
   trailing slash. Leave the existing Production value unchanged. After a
   fresh Preview deployment, use that exact branch URL for sign-in and
   protected media actions, not the per-deployment URL.
4. In the storage provider console, compare the effective `AWS_ENDPOINT_URL_S3`
   and `AWS_REGION` with the approved storage configuration. Check
   `MEDIA_PRIVATE_BUCKET` and `MEDIA_PUBLIC_BUCKET`: the buckets must be
   distinct within each environment and not shared across Production, Preview,
   or the isolated media suite. Confirm that `AWS_ACCESS_KEY_ID` and
   `AWS_SECRET_ACCESS_KEY` use separate credentials scoped to each
   environment's own buckets. The private bucket must not allow anonymous read;
   the public bucket must not allow anonymous writes.
5. In Vercel, verify Production has `INQUIRY_TEST_MODE` unset or `false` and
   `INQUIRY_EMAIL_MODE` unset or `disabled`. Preview delivery should also stay
   disabled unless simulator testing is separately approved. In that case,
   verify Preview-only settings: `INQUIRY_EMAIL_FROM` on
   `notifications.kuraishicars.com`, `INQUIRY_EMAIL_TO=delivered@resend.dev`,
   `INQUIRY_EMAIL_INBOX_ORIGIN` matching that exact Preview deployment, and
   separate test credentials/secrets. `RESEND_FROM_EMAIL` is not read by the
   app; record it as unused if still present, not as evidence of a configured
   sender. Confirm no callbacks/webhooks or worker schedules are configured
   for this app. Do not enable anything during this review.

Report the date and **DB / Auth / Media / Email and callbacks: pass, fail, or
unknown**, with a brief explanation for each unresolved result. Do not share
connection strings, tokens, credentials, or screenshots showing values.
Leave 16.11 open if any required check fails or remains unknown.

## Manual Production deployment (16.13)

Approved on 2026-11-20: an authorized release operator deploys through the
[Vercel CLI](https://vercel.com/docs/cli/deploy). Automatic Git deployments
remain disabled in [vercel.json](../vercel.json). A merge or push is not a
deployment, and approval of this procedure does not authorize running it.

1. Before deploying, obtain explicit release approval for the candidate commit.
   Verify the Production/Preview configuration (16.11), complete the approved
   migration and recovery steps (16.12), and confirm the remaining launch gates
   for the agreed scope. Record the current deployment and separately select an
   auth-safe rollback target compatible with the planned schema. The recorded
   `7fdcc66` baseline predates the sign-in hardening; do not treat it as an
   automatic rollback target.
2. Use a clean checkout of the exact approved commit. Record the full SHA
   (`git rev-parse HEAD`) and confirm there are no local changes or local
   environment files in the release checkout. From the project root, sign in
   with the authorized release account and use `vercel link` to select the
   existing approved team and project. Stop if the target or account is
   uncertain; do not create a new project or pass secrets as CLI arguments.
3. Only when the release is authorized, run `vercel deploy --prod` from that
   checkout. This may assign the Production domain as soon as the deployment
   is ready. Stop on failure; do not blindly retry or proceed to the public
   smoke test. Record the commit SHA, deployment URL or ID, operator and time,
   and confirm the Vercel dashboard shows the intended deployment as Ready on
   the Production domain.
4. Perform the smoke test in 16.14 and record the evidence and rollback
   decision in 16.15. If validation fails, follow the approved rollback plan.
   Rolling back application code does not restore the database or media.

## Release evidence and rollback decisions (16.15)

Before deploying, record the exact candidate SHA, validation results,
approved rollback target, applicable migration range, and approved recovery
point from 16.12. Record who decides whether to stop, roll forward, or recover,
and who verifies each outcome. Do not include secrets or customer records.

| Area | Stop or recover when | Evidence and recovery boundary |
| --- | --- | --- |
| Application | Auth, health, or required smoke checks fail | Confirm the failing revision and choose the approved compatible code rollback or a reviewed forward fix. Recheck auth, health, and the affected flow after recovery. |
| Database schema | Migration fails, the ledger disagrees with the approved range, or validation shows incompatible schema | Stop before deploying the new code. Preserve current state and reconcile the migration ledger. Restore only under 16.12 from an approved verified recovery point after accounting for later writes. Do not run reverse SQL blindly. |
| Imported data | Counts, ownership, or data quality do not match the approved handoff | Pause further writes/imports, preserve the current state, and reconcile only the affected rows against the approved source and existing audit history. Do not reload test fixtures or overwrite newer customer entries. |
| Media storage | Objects are inaccessible, missing, or disagree with their database references | Freeze affected media changes and compare records with the approved bucket and object inventory. Recover only the affected objects and verify their access policy and references. A database restore does not restore storage. |

After an authorized deployment, record the exact deployment ID and revision,
operator/time, 16.14 results, and any recovery decision and retest. For initial
smoke verification, keep Production inquiry intake off **only if this cannot
interrupt an existing live service**. At the authorized smoke gate, confirm
that condition first; stop and escalate if it is unclear or intake is already
live. Verify the disabled state without persisting an inquiry or sending email,
and verify protected inbox access separately. Enabling live intake requires
separate authorization. Neither a repository build nor test-mode provider
acceptance is Production release evidence.

Approved code rollback candidate (approval does not authorize deployment):
`d942bf177ea3a2a77f4dd1211a3d0690a9b5c404`. It includes the credential-form
hardening (`43f0d88`) and dashboard retry fix, and its Prisma schema,
migrations, configuration and dependency lock match the preflight candidate
`53434be`. Its known application difference is the bodyless POST fix for the
isolated-only notification worker, which it does not contain. Do not select
it if that worker becomes an essential enabled flow. Before any authorized
rollback, verify the actual migration ledger, deployment configuration and
critical paths; reuse only an approved deployment with current secrets or
build the approved SHA with current secrets. No code rollback authorizes a
schema restore or changes to data or storage.

## Open operational gates

- **12.08 verification:** Passed on loopback with two disposable non-Production
  databases. If dashboard data cannot load, **Try again** reloads the current
  URL and requests the metrics again; the error state must not display stale
  or zero KPIs. Restore the isolated query target before retrying and remove
  disposable resources afterwards. This does not resolve the Preview database
  credential rotation, upload warning, or hosted synthetic staff cleanup.

- **11.08 verification:** Passed on loopback with a disposable database,
  synthetic inquiries, and email delivery disabled. Keep provider and worker
  credentials unset for this retest. Check that failed intake leaves no inquiry
  or outbox row and that a failed note save leaves the authored note history
  unchanged. Remove only the disposable database after verification. This does
  not authorize enabling hosted intake, test-provider delivery, or Production
  changes; 16.12 remains a separate Production migration and recovery gate.

- **08.09 verification:** Use a disposable non-Production database and synthetic
  staff. A failed settings save must show an error and leave the persisted
  record and version unchanged. The saved business Website URL is not a trusted
  authentication origin and must not change the canonical URL or sitemap.
  The isolated browser retest passed; this does not change the Preview credential
  cutover plan or resolve the storage upload warning.

### Outstanding security maintenance

- **High priority: exposed Preview database credential rotation.** Follow the
  coordinated cutover below. It has not been authorized or performed.
- **Synthetic account cleanup:** After the remaining browser checks, identify
  the exact temporary Preview staff and recovery accounts and their references.
  With operator approval, revoke their sessions and disable the credentials
  without deleting referenced audit history. Preserve any account still needed
  for authorized Preview access. The earlier recovery revoked the synthetic
  administrator's old sessions; final account cleanup is still pending.

- Section 09.05: legal/business approval for inquiry retention and deletion.
- Sections 16.11-16.12 and 16.14-16.15: Production environment separation,
  migration/recovery point, execution of the approved deployment procedure,
  smoke test, and rollback evidence.

### Coordinated Preview database credential cutover

**Target:** Frankfurt `dev` (`br-plain-surf-b9e05n7g`, compute
`ep-morning-term-b9su1div`), database `kuraishi-car-dealer-db`, password role
`kuraishi-car-dealer-db_owner`. Read-only Neon metadata confirmed the role on
`dev`, not the password or its validity elsewhere.

| Consumer | Evidence and cutover requirement |
| --- | --- |
| Vercel Preview | Branch-specific `DATABASE_URL` (pooled runtime, including Better Auth) and `DIRECT_URL` (direct Prisma tooling) for `test/backend-integration-and-release`. Proposed like-for-like redeploy: `192b842d3f2d618ea692c85307a8fe77ee4a4d7c`, the last browser-verified protected revision, deployment `dpl_Cp5YBb9rnypuU95dSF9Lga76KKb1`. Both known URLs still redirect unauthenticated health requests to Vercel. That does not identify today's alias target: confirm its deployment ID/SHA and check Preview-only variable scopes in Vercel before cutover. Older deployments retain their original environment values. |
| Local development | Checked `.env.local` and the current shell: the active file uses different endpoint and role names; the shell had no applicable URL override. Check separately saved Preview overrides on other workstations. Do not change unrelated local settings. |
| Database tests | `.env.inventory-test.local` and `.env.media-test.local` use other endpoints and role names. One ignored `.env.inventory-test.local.txt` backup has the same role name at an endpoint different from both `dev` and its known recovery clone; its password was not compared. Confirm that endpoint's provenance privately; do not activate the backup or point tests at hosted `dev`. |
| Recovery and other integrations | The isolated staff recovery helper takes the `dev` direct URL via secure input. Check operator vault entries, saved database clients, CI secrets, scheduled jobs and other integrations for both endpoint forms. No additional active consumer is confirmed. The previous staff password reset did not change this Postgres role. |

**Cross-branch status is unresolved.** [Neon branch creation](https://neon.com/docs/manage/branches)
can copy role passwords from a parent unless protection regenerates them.
Check the source branch and recovery/child clones that existed during the
credential's lifetime, using branch lineage and private operator records.
For explicitly scoped non-Production endpoints only, the operator can verify
unclear cases with a fresh, secure authentication check without printing the
secret. A shared role name is not proof of reuse. Do not test any Production
endpoint; if reuse there cannot be ruled out, escalate it as a separate security
decision. Rotating `dev` does not prove that copies on other branches are revoked. Read-only metadata
confirmed that `dev-before-preview-migrations` (`br-sparkling-smoke-b9eadwya`)
was cloned from `dev`, has the same password role with the same update
timestamp, and is scheduled to expire on 2026-11-27 at 19:27 UTC. Treat it as
potentially sharing the exposed password until expiry is confirmed or its
access is separately resolved. No password was tested and expiry was not changed.

1. **Approve scope and window.** Confirm the consumer inventory, clone/reuse
   findings, maintenance owner and window, exact protected Preview revision,
   and separate permission for a Preview-only redeployment/alias cutover.
   Record the current URLs and a protected fallback revision. Pause writes and
   jobs during any traffic swap. If active misuse is suspected, escalate for
   immediate authorized revocation instead of prolonging parallel access.
2. **Stage if practical.** Prefer a short overlap with a new, scoped Preview
   login if it can perform required runtime operations without unnecessary
   privileges. Preserve ownership and validate the direct tooling role
   separately without running migrations; do not remove or reassign the owner
   role. If grants or ownership make this unsuitable, use a coordinated
   in-place reset of `dev`'s owner password. [Neon's role reset](https://neon.com/docs/reference/api/branches/reset-project-branch-role-password)
   drops compute connections; wait for its operations to finish. Expect the
   existing deployment, local clients and direct tooling using the old secret
   to fail until refreshed. Keep any overlap short and time-bounded.
3. **Update and verify.** Store new URLs only in the approved secret stores;
   update both branch-scoped Preview variables and only confirmed local or
   integration consumers. Preserve SSL options, connection types and all
   other environment settings. [Vercel changes apply only to new deployments](https://vercel.com/docs/environment-variables/managing-environment-variables).
   Verify Deployment Protection and the exact revision on the generated URL
   and branch alias. Open fresh pooled and direct connections and check the
   expected database/role and migration ledger read-only. Behind protection,
   check `/api/health`, synthetic staff sign-in and anonymous access denial,
   and create/edit/read/delete a disposable never-published draft. Confirm
   inquiry and email delivery are off. Restart affected clients and verify
   their fresh connections. Don't run migrations or send email.
4. **Revoke and close.** For a staged cutover, invalidate the old owner
   password as soon as the replacement is verified. For either path, confirm
   from fresh connections that the old password is rejected on both `dev`
   endpoint forms and the replacement still works; a network or TLS failure
   is not evidence of rejection. Ensure old sessions cannot continue using
   access; retire or mark stale Preview deployments as unavailable under
   the approved scope. Record timestamps, revision, URL disposition and
   sanitized results, not secret values.
5. **Recover forward if checks fail.** Keep Preview protected and writes
   paused. Fix the new settings/grants or issue a fresh unexposed owner
   password on `dev`, update all affected settings, and re-verify. Use a
   previous known-good code revision only with current valid credentials.
   Do not restore the exposed password, repoint to another branch or restore
   database/storage state to recover from a credential cutover.

No Production database, bucket, deployment, email, snapshot, or restore action
was used while preparing this runbook.
