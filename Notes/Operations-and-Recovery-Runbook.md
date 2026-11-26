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
- **2026-11-26 loopback controls:** Fresh Chrome 158 and Edge 158 profiles both
  reported `Network.loadingFinished` for same-origin and cross-origin
  multipart POSTs returning a bodyless HTTP 204, including explicit response
  reads and a connection-close variant. A cross-origin 200 control also
  finished. The local receiver checked the synthetic multipart payload and
  the successful requests reached a stub completion endpoint. Explicit
  aborts before headers and after headers on a streaming 200 control both
  produced `net::ERR_ABORTED`; neither reached completion. Both browsers use
  Chromium, and loopback HTTP does not reproduce the provider, TLS, or
  hosted application conditions. A bare 204 and leaving its body unread were
  not sufficient to reproduce the warning. No client or storage change was made.
- **Next diagnostic step:** Follow the isolated provider-level protocol below.
  Do not retry uploads or change the response handling based only on the warning.
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

### Isolated provider-level upload trace (authorization required)

1. **Approve the exact target and write scope first.** Prefer an existing
   disposable non-Production Neon Object Storage bucket with an isolated,
   already-configured app/database if exercising finalization. Record the
   verified project, branch, bucket, permitted test keys and expiry, test
   window, and cleanup owner. Obtain explicit authorization before any hosted
   writes or resource changes, including synthetic objects. If no approved
   target exists, stop; provisioning a new target requires separate approval.
   Do not use the stable Preview credential-cutover environment, alter CORS or
   permissions, deploy, or run migrations.
2. **Compare like for like.** Use a tiny synthetic image, fresh Chrome and
   Firefox profiles, one independent key per case, and the same approved app
   origin and bucket. Run the signed multipart POST with a minimal Fetch
   client and, if already available on the authorized isolated target, the
   existing upload-and-finalize flow in both browsers. Do not use network
   interception, forced aborts, or automatic retries. If finalization cannot
   be exercised, report transport and object verification separately. Do not
   repeat the completed loopback controls unless the setup reveals a specific
   need for another control.
3. **Record an allowlisted timeline, not a raw trace.** Give each case a
   synthetic label. Record UTC start and relative timings for browser send,
   response headers, Fetch resolution/rejection and terminal network event.
   Include browser version, HTTP protocol, redirect count, status, cancellation
   flag or error, and response-framing header names/values where available and
   safe. Use Chrome CDP and Firefox Network Monitor or WebDriver BiDi; record
   unavailable fields rather than inferring them. Correlate with provider
   receive/response UTC timestamps, status, duration and a provider request
   ID if available. Keep the ID only in restricted notes or use a consistent
   alias for sharing. Do not enable new logging without approval. Record any
   clock or timing uncertainty. Do not save raw HAR files, URLs, query strings,
   object keys, cookies, headers carrying credentials, signing fields, or
   payloads.
4. **Verify independently and clean up.** Record finalization status when
   tested, then verify object readback, byte count and image decoding using
   authorized access. Report a 204 plus a later cancellation separately from
   failed finalization or missing bytes. If provider timing is unavailable,
   say so and leave the cause open. Use the existing guarded app cleanup for
   app-created intent/assets and delete only individually authorized,
   test-owned transport objects. Verify absence and document any pending
   cleanup. Leave credential maintenance and Production gates untouched.

#### 2026-11-26 isolated provider trace evidence

- **Isolation:** Frankfurt project `twilight-bread-36837209`; completed run on
   schema-only root `br-tiny-salad-b94e31it`, compute `ep-floral-snow-b99gylwq`.
   Verified all 16 public tables empty and no inherited buckets before
   seeding. Used new `storage204-cfe6081e-private` and
   `storage204-cfe6081e-public` buckets, a dedicated branch-only database role
   and an expiring `storage:read`/`storage:write` credential. Secrets went
   directly from CLI subprocess output held in memory into the isolated runner.
   The app ran from a tracked-source copy with no checkout env files, no
   migrations, inquiry test mode off, and email disabled.
- **Actual UI:** Chrome 158 and Firefox 137 each uploaded an original and
   replacement via the Media tab. All four signed multipart requests were
   HTTP/2 204 with no redirects. Chrome reported `loadingFinished`; Firefox
   reported `responseCompleted`. Each produced one asset row, decoded in
   the UI, matched the original SHA-256 on independent S3 readback, and left
   no staging object. In both browsers, saving the replacement left it as the
   only draft attachment; deleting the detached original removed its row
   and object.

| UI case | Browser POST start UTC | Browser headers after start | Nearby provider POST UTC | Provider duration |
| --- | --- | ---: | --- | ---: |
| Chrome original | 10:57:56.954 | 299 ms | 10:57:57 | 47 ms |
| Chrome replacement | 10:58:01.551 | 87 ms | 10:58:01 | 54 ms |
| Firefox original | 10:58:38.906 | 484 ms | 10:58:39 | 64 ms |
| Firefox replacement | 10:58:40.761 | 106 ms | 10:58:40 | 73 ms |

- **Negative and concurrency controls:** Completing an intent with no
   uploaded object returned 409. Canceling a staged upload succeeded; a
   subsequent completion returned 409 and no canceled object remained.
   Simultaneous completion requests returned 200 and 409 in each browser;
   a repeat completion then returned the same asset. No duplicate asset
   rows, missing final objects, or orphan objects were found in the final
   database-to-bucket reconciliation. An absent object and explicit app
   cancellation are not equivalent to a mid-transfer network interruption.
- **Limits:** The provider returned 70 records, including seven visible
   POST 204 records for eight successful browser POSTs. The table pairs
   isolated UI events by UTC window and status, not a shared request ID;
   provider timestamps are second-resolution. One POST was not independently
   correlated. The recurring hosted `net::ERR_ABORTED` warning did not
   reproduce, so its root cause and effect when it occurs remain unknown.
   No application defect was established and no speculative change was made.
   If it recurs on a separately authorized target, capture both terminal
   events, the provider request correlation if available, and independent
   readback before deciding whether it affected a write.
- **Cleanup:** Verified synthetic rows gone, both buckets empty before
   removal, the storage credential revoked, and the disposable branch absent
   after deletion (removing its compute and database role). The loopback app,
   copied checkout, and browser profiles were removed. The cutover environment
   and historical branches were not modified.

#### Capture the next hosted Preview occurrence

This is a capture procedure for the next **authorized** hosted Preview
workflow, not permission to start a new run or change Preview. Do not repeat
the completed disposable comparison unless new evidence establishes a
specific hypothesis to test.

1. **Before the upload:** Confirm the deployed SHA, protected Preview
    target and isolated private storage scope without recording secret values.
    Use one approved synthetic image and a short case label. Record UTC,
    app route, browser build, DevTools/interception state, and whether a
    navigation, reload, or cancellation was expected. Start a narrow network
    capture before selection; do not enable new provider logging or export a HAR.
2. **At the warning:** Tie the 204 and terminal network event to the *same*
    browser request in memory. Record POST count, protocol, redirects, header
    and terminal timing, cancellation flag, exact network error, and observed
    UI/Fetch outcome where available without changing the app. Capture the
    completion request status separately. Note whether page navigation or
    cancellation preceded the event; do not infer cause from event order
    alone or re-upload just to clear the warning.
3. **Correlate and verify:** Query only the authorized Preview storage bucket
    and a narrow UTC window for POST status, provider timestamp and duration.
    If a provider request ID is visible and matchable, keep a case-local
    alias; otherwise mark the match timing-based or unavailable. Record
    clock precision and distinguish a provider POST from later HEAD, GET,
    copy or DELETE operations. Independently verify whether the final asset
    was recorded once, the retrieved bytes match the synthetic file, the
    image decodes, and staging cleanup completed or is explicitly pending.
4. **Report the outcome:** Preserve the allowlisted timeline and verified
    effects only. Exclude signed URLs, raw object keys, request bodies,
    IPs, cookies, credentials and signing fields. Classify the result as
    confirmed write/readback failure, successful write with unresolved trace
    warning, or inconclusive. Keep the warning open unless evidence explains
    the original occurrence. If the record and object disagree, stop test
    writes and use the existing guarded reconciliation/cleanup flow.

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

V1 staff handle customer inquiries in the protected admin inbox. Keep
`INQUIRY_EMAIL_MODE` unset or `disabled`; do not provision external callbacks,
schedule sends or enable staff or visitor delivery. Preserve the existing
internal outbox and authorization safeguards and the visitor's on-screen
feedback. Mock checks are sufficient for v1; the isolated simulator procedure
below is retained for separately authorized testing, not as a release step.

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

## Protected customer-review deployment

This is a non-Production readiness procedure, not deployment authorization.
Use a dedicated Vercel Preview target with named reviewer access, fresh
branch-scoped database/storage/auth credentials, separate private/public
buckets and synthetic inventory/inquiries only. Do not use the stable
credential-cutover Preview target or its exposed credential. No unrestricted
visitor access, real inquiry intake, external delivery or callbacks.
Published test images may be visible through direct storage URLs even when
the app is protected; never upload private or real inventory media for review.

1. Record the exact candidate revision and authorized target. Before writes,
   verify the branch's pooled/direct hosts, buckets and credentials against
   the explicit review allowlist; ensure Production and legacy Preview are
   excluded. Verify review credentials are scoped to review resources and
   the protected alias is the    exact Better Auth origin. Do not perform
   isolation tests by writing to Production. Confirm the protection and
   noindex policy can be checked without weakening access.
2. After separate hosted authorization, apply the migrations only to the
   verified review database. The review settings migration adds four nullable
   columns without copying customer data or backfilling business details.
   Generate the client and confirm the ledger/schema before serving the
   matching code. Check compatibility of the nominated review rollback
   revision with the migrated schema; earlier rollback evidence does not
   cover this migration. Record the exact SHA and manual non-Production deployment
   result; do not promote it or attach the Production domain.
3. Keep `INQUIRY_EMAIL_MODE=disabled`; enable `INQUIRY_TEST_MODE` and a
   review-only hash secret only under Deployment Protection if synthetic
   inquiry testing is authorized. Bootstrap named review access and staff
   accounts through approved channels, not a shared password. Enter the
   supplied card through versioned Settings, not a migration or seed.
4. Follow the [focused owner acceptance checks](./Implemented-Sections-Test-Guide.md#protected-v1-customer-review-acceptance).
   Record smoke results and cleanup ownership before inviting the customer.
   Share the protected URL, account setup instructions and acceptance guide
   through approved channels. Ask for feedback by workflow; do not request
   screenshots containing credentials or personal inquiry data.
   If review validation fails, withhold the invitation; disable the review
   target or return to an approved review revision without touching
   Production or undoing unrelated Preview settings. Keep the credential
   cutover, synthetic account cleanup and Production gates separate.

### Customer-review rehearsal record

- Candidate: `release/v1-customer-review`, `a7b5d14da70c64eaac74ef3306ccf53a7e3b617e`.
- Neon Frankfurt project `twilight-bread-36837209`; independent schema-only
  branch `br-green-salad-b9ny9nov` (`v1-customer-review`), compute
  `ep-weathered-feather-b9l8tucg`. `v1_customer_review` was created empty;
  `v1_review_regression` was a separate database on the same review branch.
  Migration ownership and non-DDL runtime access use separate new roles.
  The new branch-scoped storage credential has read/write storage scopes
  only, and the empty `v1-customer-review-private` and
  `v1-customer-review-public` buckets matched their intended visibility.
- The 12 baseline migrations and then the additive migration applied only
  to the review database. Prisma reported no schema drift. All four added
  columns were nullable, length-bounded, and had no defaults. The migrated
  review database had zero dealership, staff, vehicle, inquiry and media rows
  at `2026-11-26T12:10:01.299Z` (`0/27A5D08`). This is a pre-onboarding
  recovery anchor, not a backup or proof of a restore. Before later writes,
  recheck the available recovery window; before owner onboarding, the empty
  state can also be rebuilt from the exact migration chain.
- Dedicated Vercel project `prj_8LDQLTEcBGwJUV6phHwlWyPpF1z8`;
  Ready non-Production deployment `dpl_ESRoRqatdodL9hdA2UeLhSxnb7ia`.
  [Generated URL](https://kuraishi-v1-customer-review-bwaysav2y-nikzad-behnams-projects.vercel.app)
  and [review sign-in origin](https://kuraishi-v1-review-sandbox.vercel.app).
  Vercel Authentication applies to all URLs; the 13 review variables were
  confirmed as Preview-only and branch-specific. External email is disabled;
  no provider callback or worker credential was configured.
- The initial API request omitted the deployment target, and Vercel
  classified it as `production` inside the new isolated project. It was
  canceled while building (`dpl_3fgAFq7cbKv4r4LTMvfht3TnkcWF`); no Ready
  Production target exists there. Use the explicit `staging` target for this
  API path, and verify exact SHA, target and project before testing. The live
  Production and development Preview projects and data were not touched.
- The authorized review operator completed Settings onboarding and the
  hosted synthetic smoke described in the [readiness report](./report.md#protected-v1-customer-review-readiness).
  Keep the exact deployment protected. Before inviting anyone, settle the
  replacement deployment and confirm the ordinary staff workflow on it. Obtain
  separate approval for named owner access, grant only review deployment
  access, and provision a separate, named ordinary staff account in the
  review database. Use private approved channels for credentials, never the
  test guide or the shared operator account. Assist with master-only media
  approval and deletion rather than broadening permissions.

#### Customer-review upload observation

On November 26 at `12:59:27.581 UTC`, the built-in Chromium browser reported
`net::ERR_ABORTED` for the synthetic vehicle image POST to the private review
bucket. No navigation or cancellation was requested during the upload. The
app reported success and the asset persisted once as an attached private
image; its approved public copy decoded on the published listing. The
private original was detached and deleted through the approved UI flow,
and readback confirmed no private asset row remained. Provider storage logs
were present in the bounded time window, but a matching POST status and
request ID were not established. The browser did not correlate a 204 with
the terminal event. Byte-for-byte comparison and staging cleanup were not
independently checked in this hosted pass. Classify as a successful write
with an unresolved trace warning, not a verified recurrence of the exact
204 sequence. Do not retry merely to clear the warning.

During ordinary-staff acceptance (`2026-11-26 13:13:10.319 UTC`), Chromium
reported HTTP 204 and `net::ERR_ABORTED` for the private bucket's POST
traffic. The trace did not establish that the events shared a request ID.
Finalization returned 200, and one private vehicle attachment persisted.
After reopening the draft, a separate signed GET from the review bucket
returned 200 and decoded at 640 by 480; all 15,368 bytes matched the
synthetic PNG. Provider-side request ID and staging cleanup were not
independently verified. Keep the warning open without changing upload code.

#### Replacement candidate deployment gate

After explicit approval, pin the verified replacement SHA on
`release/v1-customer-review` and update only the dedicated review project's
exact-commit build guard. Deploy using explicit `staging`, verify the Ready
SHA and project, and update only the protected review alias. Retain the
previous Ready deployment as the review rollback candidate. This homepage
change needs no migrations or environment updates. Recheck anonymous SSO,
app noindex/robots, the responsive homepage and neutral copy, and ordinary
staff sign-in, allowed workflows, administrator denials and logout before
requesting separate permission to invite the owner.

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

- **14.08 verification:** Use loopback with synthetic settings and fail on
  external decorative image/video requests. The homepage and About assets
  ship with the app; validate video, poster fallback, attribution and the
  responsive image after a code change. See the [media source and retest guide](./Implemented-Sections-Test-Guide.md#decorative-media-source-license-and-isolated-retest).
  Recover a broken decorative asset with a known-good local file and its
  matching credit; do not restore remote hotlinks, change inventory media
  storage or alter consent behavior as a recovery measure. Legal copy and
  consent remain separate approvals. No Preview credential or hosted change
  is needed for the isolated retest.

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
| Vercel Preview | The operator verified on 2026-11-26 that the stable alias serves READY deployment `dpl_Cp5YBb9rnypuU95dSF9Lga76KKb1` at `192b842d3f2d618ea692c85307a8fe77ee4a4d7c`. This is the confirmed like-for-like redeploy revision. `DATABASE_URL` (pooled runtime, including Better Auth) and `DIRECT_URL` (direct Prisma tooling) are sensitive, Preview-only, and scoped to `test/backend-integration-and-release`. Recheck for drift at the maintenance window. Older deployments retain their original environment values. |
| Local development | Checked `.env.local` and the current shell: the active file uses different endpoint and role names; the shell had no applicable URL override. Check separately saved Preview overrides on other workstations. Do not change unrelated local settings. |
| Database tests | The active `.env.inventory-test.local` and `.env.media-test.local` do not target `dev` or any of the three known clones below. The ignored `.env.inventory-test.local.txt` backup formerly pointed to the Section 02 clone with the affected role name. No tracked script or running command referenced it. With operator approval, it was replaced with a value-free retirement note on 2026-11-26. This does not erase any external copies or revoke a password. Do not activate this file or point tests at hosted `dev`. |
| Recovery and other integrations | The isolated staff recovery helper takes the `dev` direct URL via secure input. Check operator vault entries, saved database clients, CI secrets, scheduled jobs and other integrations for both endpoint forms. No additional active consumer is confirmed. The previous staff password reset did not change this Postgres role. |

**Inventory checked on 2026-11-26:** GitHub reports zero Actions workflows;
no tracked CI or saved-client configuration references the affected computes.
The current shell has no database URL or PostgreSQL service override, and
standard current-user PostgreSQL, pgAdmin and DBeaver profile paths were not
present. This does not cover custom profile paths, other workstations,
external CI, scheduled jobs, or operator vaults. Search those privately by
project, role and both hostname forms. Report only owner, target and whether
the entry is active, stale or absent.

**Cross-branch exposure:** [Neon branch creation](https://neon.com/docs/manage/branches)
can copy role passwords from an unprotected parent. Read-only metadata confirms
the three branches below are direct `dev` clones in the Frankfurt project and
have the same password role and role-update timestamp as `dev`. Treat all
three as potentially sharing the exposed password. Metadata does not establish
current password equality, and the exposed password must not be tested against
any database. A `dev` reset does not revoke a password still present on a clone.
Possible Production reuse remains unresolved and is a separate security decision
for the Production owner; do not inspect or connect to Production here.

| Frankfurt clone | Evidence of need and recommended disposition |
| --- | --- |
| `dev-before-preview-migrations` (`br-sparkling-smoke-b9eadwya`) | Pre-migration recovery copy. Still `ready` on 2026-11-26. Leave its scheduled expiry unchanged (2026-11-27 19:27:11 UTC). After that time, query the exact branch ID within the Frankfurt project; only a confirmed not-found result with valid Neon access proves removal. If it still exists or the lookup is inconclusive, stop and investigate rather than deleting it. |
| `test-section02-inventory-20261117` (`br-billowing-field-b9ay9qjo`) | Original Section 02 integration target, still named in historical retest instructions. No active local file points to it; the stale backup does. Compute last active 2026-11-18; no expiry reported. Confirm no outside consumer or retained evidence is needed, then retire it under explicit approval; otherwise rotate its login separately. |
| `test-section03-media-20261118` (`br-autumn-lab-b9at740a`) | No active local media config or tracked dependency on this exact Frankfurt compute was found. Compute last active 2026-11-18; no expiry reported. Confirm no external consumer or recovery need before approving retirement; otherwise rotate its login separately. Identify the branch by project and ID, not name alone. |

**Deployment impact:** The current deployment `dpl_Cp5YBb9rnypuU95dSF9Lga76KKb1`
and its generated `2zz6z030c` URL will lose database-backed functionality
once the old password is invalidated. The stable alias will be affected until
it serves the replacement. Earlier Preview `8mnnfsrxg` (`82ed1e8`) predates the
confirmed overrides; its effective DB credential is unknown. Every other
deployment with the same old `dev` credential will be affected, even after the
project variables are updated. Inventory the branch's Preview-only deployment
IDs, generated URLs and aliases in Vercel before the window; classify
unverified deployments as potentially affected, not as rollback options.

**Provisional window:** 2026-11-27, 21:00-23:00 CET (Europe/Rome).
The designated maintenance owner has not authorized the cutover. The window
depends on verified recovery clone removal and completion of the external
consumer checks. Only the `dev` credential reset, branch-specific Vercel
updates and protected Preview redeploy are proposed. Historical test branch
retirement and Production are not authorized.

1. **Confirm scope and preflight.** Check remaining consumer and retention
   findings, verify recovery clone expiry, and confirm the maintenance owner,
   window and explicit `dev`-only cutover authorization. Clone or stale-file
   cleanup requires its own approval. Check for any vault or sync copies of
   the retired local backup; do not modify active test config. Separately escalate possible
   Production reuse to its owner. Recheck the Preview source SHA, target,
   branch variable scopes and Deployment Protection; stop if anything drifted
   or the operator cannot perform a source-backed redeploy. Pause Preview
   writes and any confirmed jobs. Allow time for a build and retest during the outage.
2. **Reset in place on Frankfurt `dev`.** Preserve the branch, database and
   owner/permissions. Reset only `kuraishi-car-dealer-db_owner` through the
   approved secret-handling interface, never through chat or command logs.
   [Neon's role reset](https://neon.com/docs/reference/api/branches/reset-project-branch-role-password)
   drops compute connections. Wait for the reset operation to finish and open
   fresh pooled and direct connections using the replacement. Confirm the
   database, role and migration ledger read-only. Do not probe with the old password.
3. **Update and redeploy.** Store the fresh pooled URL in `DATABASE_URL` and
   direct URL in `DIRECT_URL`, as sensitive Preview-only overrides on
   `test/backend-integration-and-release`. Preserve TLS options and leave
   other settings unchanged. Update only confirmed consumers. Create a new
   protected Preview build from the exact confirmed SHA using current
   branch-scoped variables; do not reuse prebuilt output or accidentally build
   the latest branch tip. [Vercel changes apply only to new deployments](https://vercel.com/docs/environment-variables/managing-environment-variables).
   Verify the generated URL before moving the alias if the workflow allows;
   if it auto-assigns the alias, keep the maintenance window open and verify
   both immediately. No Production target or promotion.
4. **Verify and reopen.** Record the new deployment ID and SHA. Confirm both
   URLs enforce Vercel Authentication. Behind it, check `/api/health` returns
   `200 {"status":"ok"}`, synthetic staff can sign in, and no app session
   means no staff API access. Create, edit, read and delete a disposable
   never-published synthetic draft. Verify inquiry and email delivery stay off.
   Restart affected clients, confirm fresh connections and retire or mark
   stale deployments under the approved scope. Record sanitized results and
   reopen only after checks pass. No migrations or email sends.
5. **Recover forward if checks fail.** Keep Preview protected and writes
   paused. Fix the new settings/grants or issue a fresh unexposed owner
   password on `dev`, update all affected settings, and re-verify. Use a
   previous known-good code revision only with current valid credentials.
   Do not restore the exposed password, repoint to another branch or restore
   database/storage state to recover from a credential cutover.

No Production database, bucket, deployment, email, snapshot, or restore action
was used while preparing this runbook.
