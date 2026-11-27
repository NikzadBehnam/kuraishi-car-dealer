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

See the [Phase 4 proposed schedule and erasure rehearsal](#inquiry-privacy-retention-and-operator-erasure-phase-4).

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
   origin.
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

## Leads status deployment

See the [Phase 3 release record](./report.md#leads-status-management-phase-3-release)
for the deployed revision, migration ledger, and retained recovery point.
The staff workflow requires only column-level `UPDATE ("status")` on
`public."Inquiry"` for `kuraishi_v1_runtime`. Do not grant table-wide
`UPDATE`, enable real intake, or broaden notification privileges to support
status management. If the Production inbox is empty, verify the live filter
and private search without inserting fixtures, and use an isolated database
for populated details, status writes, and notes.

## Vehicle photo cutover

The implementation branch is based on the protected customer-review
release. The Git default branch is `master`; the Production database branch
is `main`. See the [release record](./report.md#vehicle-photo-simplification)
for the approved cutover and its verification.

1. Stage the exact verified Vercel Production candidate without assigning
   the domain. Confirm Vercel Authentication, the named customer access,
   anonymous denial, `noindex, nofollow`, sitemap denial, disabled email
   and inquiry modes, and the known Production direct and private-storage
   targets. Keep the existing rollback deployment available.
2. Freeze writes on all serving deployments that can reach Production.
   Wait for outstanding legacy upload grants to expire. Recount vehicles,
   associations and assets; list both buckets; save the exact counts, a
   restricted legacy metadata manifest, and a verified pre-cutover recovery
   point. If new or unknown public objects are present, stop for review.
   For every attached private image verify its object; for every attached
   public image copy and verify it at `photo-migration/<asset ID>` in the
   existing private bucket. Never run the backfill while legacy writes can
   still succeed.
3. Use Prisma `migrate deploy` on the confirmed direct Production target.
   `20261127100000_backfill_vehicle_photos` copies attached photo IDs,
   vehicle IDs, position and technical metadata into `VehiclePhoto`.
   `20261127110000_retire_legacy_media` aborts on backfill drift or active
   grants, then creates the upload and deletion tables and drops
   `VehicleMedia`, `MediaAsset`, `MediaUploadIntent`, their triggers,
   functions and enums. These migrations do not delete objects or vehicles.
   Reconcile schema, migration checksums, photo counts and runtime grants
   (including CRUD on the three vehicle photo tables) before promotion.
4. Retire only the following redundant objects from
   `kuraishi-production-public` after explicit deletion authorization.
   The read-only inventory on 2026-11-27 showed zero vehicles, zero
   associations and no live grants. Each listed public key matched its
   `assets/<same filename>` private original by exact size and ETag.
   Recheck those matches at cutover. Preserve all 11 private originals and
   do not delete the bucket or any other object.

   | Public key | Bytes | ETag |
   | --- | ---: | --- |
   | `approved/1c705031-5d27-4d88-9e03-594cc4c8c902.jpg` | 107610 | `c9ffd318d4305f587c28a826017369a9` |
   | `approved/925228d7-83d7-4131-bfb3-c5331ffa2208.jpg` | 162032 | `3960a08b4284ea30e26cca8733188e82` |
   | `approved/95ecc3d3-7fbd-43e7-8125-1d1a185f9490.jpg` | 149423 | `8efad8ee6eb7d10241682787c33b34f4` |
   | `approved/bae65bc1-9742-455f-bd97-6738c6ab11d8.jpg` | 149423 | `8efad8ee6eb7d10241682787c33b34f4` |

5. Merge the reviewed revision, promote the verified deployment to
   `www.kuraishicars.com`, and check the legacy paths are absent and the
   authenticated ordinary-staff Vehicles → Create vehicle → Photos tab works
   without an administrator action. Recheck no indexing, no sitemap, no
   anonymous access and no external email. Use the existing isolated tests
   for synthetic CRUD; do not write test records into customer Production
   without separate approval. Restore access after the smoke checks pass.

Rollback after the retiring migration is **not** a code-only Vercel rollback:
the old app expects the dropped schema. Keep writes frozen, capture evidence
and obtain approval for the tested database recovery procedure before pointing
the domain at the old app. The 11 private objects are left intact; restoring
public copies or database state requires separate authorization.

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
3. For an unrestricted release only, when separately authorized, run `vercel deploy --prod` from that
   checkout. This may assign the Production domain as soon as the deployment
   is ready. Stop on failure; do not blindly retry or proceed to the public
   smoke test. Record the commit SHA, deployment URL or ID, operator and time,
   and confirm the Vercel dashboard shows the intended deployment as Ready on
   the Production domain.
4. Perform the smoke test in 16.14 and record the evidence and rollback
   decision in 16.15. If validation fails, follow the approved rollback plan.
   Rolling back application code does not restore the database or media.

## Protected main-domain V1 cutover

**Completed on 2026-11-26.** This section retains the approved cutover
procedure and historical evidence, not permission to repeat it or to open
the site to the public. Keep the existing project and DNS. The
[delivery record](./report.md#v1-delivery-milestone) records current status.
The exact deployed application revision is
`152742d366d47b5d3d6dd92e5218947206cea3bb` on
`release/v1-customer-review`; do not merge merely to deploy it.

1. **Approve the cutover window and access change.** Project
   `prj_nQ4GyGpomFCQPPuEsMtHVUyC0kyD` excluded custom domains before cutover
   from its Vercel Authentication. Capture current aliases, access settings,
   exceptions, route-rules version, credentials provenance and deployment
   ID. Confirm public availability impact, named operator access and the
   owner's expected access method on the actual `www` hostname. Turning on
   [All Deployments protection](https://vercel.com/docs/deployment-protection)
   also gates the existing site and other project URLs. Do not start that
   change before the agreed window. If public access must continue
   uninterrupted, defer the main-domain cutover and keep the isolated review
   separate; do not expose V1 as a fallback.
2. **Confirm effective Production settings before writes.** Reconcile
   `DATABASE_URL` (pooled runtime) and `DIRECT_URL` (direct, used by
   Prisma) against Frankfurt `main`, `br-damp-shape-b9jjarf6`,
   `ep-silent-mountain-b966e9p0`, database `kuraishi-car-dealer-db`.
   Compare provisioning provenance privately and establish that neither
   credential uses the exposed Preview password; the same role name exists
   on both branches. Confirm `BETTER_AUTH_URL=https://www.kuraishicars.com`
   and an independent `BETTER_AUTH_SECRET`. Keep apex redirecting to `www`;
   do not add generated URLs as trusted auth origins. Confirm
   `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`,
   `AWS_SECRET_ACCESS_KEY`, `MEDIA_PRIVATE_BUCKET` and `MEDIA_PUBLIC_BUCKET`
   against storage project `wispy-union-42314552`, branch
   `br-patient-heart-bgatd0h7`, with `kuraishi-production-private` and
   `kuraishi-production-public` and a dedicated scoped credential. Keep
   `INQUIRY_TEST_MODE` false/unset, `INQUIRY_EMAIL_MODE` disabled/unset,
   and worker, sender and callback credentials and schedules off.
   `RESEND_FROM_EMAIL` is unused; the exact candidate has a built-in `www`
   canonical origin, so the legacy `NEXT_PUBLIC_SITE_URL` entry is not
   evidence of its SEO configuration. The saved auth origin is confirmed.
   The production branch's S3 endpoint is
   `https://br-patient-heart-bgatd0h7.storage.c-9.eu-central-1.aws.neon.tech`,
   region `eu-central-1`, path-style. The designated branch-scoped storage
   credential has read/write scopes and expires `2027-02-21T09:40:31Z`.
   Vercel database, storage and auth secrets are write-only. Use the
   provisioning record or vault history to verify their mapping, creation
   and independence; the Neon provider query and prior operator checks
   do not establish which credential the next deployment will use. Do not
   export environment files. If Production password non-reuse cannot be
   proven, stop and seek approval for a separate remediation.
3. **16.12: recovery and migrations.** On the verified direct target,
   inspect migration status and compare applied checksums and schema to
   the approved chain. The read-only Production ledger confirms exactly
   one applied Better Auth baseline, matching the pinned Git checksum,
   and 12 pending migrations,
   from `20261117180000_vehicle_inventory` through
   `20261126124000_dealer_review_business_details`. The order is auth
   baseline, inventory and `Dealer`, media/assets/integrity/upload
   lifecycle and vehicle links, dealership settings, inquiry tables,
   guards/outbox/notes, then the four nullable `Dealer` fields. Apply the
   intact chain, not selected SQL files. Stop on failed/diverged history,
   drift, wrong target, or an unexpected pending range.

   Freeze affected writers, then capture UTC and LSN and take an approved
   retained recovery copy or encrypted custom-format logical backup over
   the direct target. Keep it through cutover, smoke, and an agreed
   rollback observation window beyond Neon's six-hour history horizon.
   Propose seven days for this release only, or longer if the release is
   not accepted by then, subject to owner approval and access/retention
   policy. Record the branch ID, parent LSN, UTC timestamp, expiry and
   access owner. For this Free-plan V1 release the owner waived the
   Production restore drill. Immediately before migration, verify
   the retained point exists, is Ready, and covers the write freeze
   and rollback window; refresh it with a new no-compute point if
   writes occurred or its remaining retention is insufficient. Stop
   if quota prevents a usable point. A branch readback is not a
   restore test. Rehearse the migration chain with synthetic data.
   Recovery time and recoverability of the retained copy remain untested.

   **2026-11-26 execution hold:** The Frankfurt `main` ledger contains
   only the completed, checksum-matched Better Auth baseline. The
   migration login's required schema, ledger and `user.id` reference
   grants were confirmed. The retained copy was Ready and the manual
   snapshot remained present. The project had seven of ten branch slots
   in use, and both Production media buckets were empty at preflight.
   The observed WAL position `0/1F979B8` was ahead of the retained point
   `0/1F13410`; this does not establish which writes occurred. Capture
   a fresh point after the freeze without replacing either retained
   resource. The live homepage returned `200`, and its deployed source
   still exposes a write-capable Better Auth route. A sample with no
   other connected clients is not a write freeze. Before taking a new
   point, verify that authentication writes are blocked on all
   entry points that share Production and that other direct writers
   are paused and drained. No migration or cutover was performed.

   The direct login and role checks passed in the private console.
   The operator approved blocking both `/api/auth` and `/admin` and
   their subpaths in Production: the serving `/admin` routes can call
   Better Auth directly. The Vercel firewall API activated the rule
   immediately when no firewall config existed; do not use that call
   as a draft-only operation. The rule was removed immediately and
   its absence and the homepage and auth endpoint's `200` responses
   were verified. No freeze or fresh recovery point was verified.

   **2026-11-26 retry:** Private Prisma status confirmed the 12 pending
   migrations. The Production-only rule denied the four auth/admin
   probe paths on public entry points (following the apex redirect where
   applicable). Fourteen generated hosts redirected to existing Vercel
   Authentication; the firewall was not independently probed through
   those authenticated sessions. The public homepage stayed available.
   The frozen database showed no other client connections, prepared
   transactions or enabled subscriptions. Both Production media buckets
   remained empty. Neon readback confirmed a Ready, no-compute branch
   `br-bitter-shadow-b9zci11r` from `main` at LSN `0/1FF4478`, with
   parent timestamp `2026-11-26T15:48:09Z` and expiry
   `2026-12-03T15:48:20Z`. The earlier copy and original snapshot were
   left untouched. Production restore testing remains waived, not verified.

   The private console exited before consuming the execution signal.
   The signal was withdrawn, and readback confirmed only the completed
   baseline and no `Dealer` or `Vehicle` tables. No migration or
   post-migration grants ran. The temporary rule was removed and the
   homepage, session endpoint and admin returned `200`. Before retrying,
   verify the private runner process remains live, re-establish the
   freeze and refresh the recovery point if it no longer covers the
   freeze. Do not remove the earlier recovery resources.

   **2026-11-26 completed execution:** The earlier process vanished
   before claiming its signal; no process-exit event identified what
   terminated it. An independent interactive Windows task with a
   PID/start-time check, heartbeat, and a one-shot, short-lived
   signal passed offline success, child failure, stale-signal and
   replay tests before use. The task then completed with exit code 0.
   The Production-only rule was verified as before; no other clients,
   prepared transactions or enabled subscriptions were observed.
   Both media buckets were empty. The previous branch was behind
   the frozen WAL position, so a new Ready, no-compute branch
   `br-silent-cell-b9gtcox0` was retained at LSN `0/2013680`, parent
   timestamp `2026-11-26T15:58:31Z`, expiry `2026-12-03T15:58:40Z`.
   Earlier branches and the original snapshot were preserved. No
   Production restore was attempted; restoration remains waived.

   Prisma deployed the exact 12 pending migrations as
   `kuraishi_v1_migration` through the direct Frankfurt endpoint.
   Post-deploy status passed and all 13 ledger names and checksums
   matched the pinned chain in order. Catalog verification found
   10 app tables, 14 foreign keys and 42 checks, no unvalidated
   constraints, 41 app and ledger indexes, four nullable dealership
   fields, three media triggers and no public sequences. Scoped grants
   matched the required runtime permissions with zero mismatches;
   future objects still require explicit grants, not broad defaults.
   This was a catalog permission check, not a hosted V1 smoke test.
   The temporary rule was removed and the homepage, auth session
   endpoint and admin returned `200`. No Vercel connector, deployment,
   domain, Preview or review-environment settings were changed.
   Hosted candidate and rollback smoke checks remain separate.

   Capture media inventory separately, including relevant object keys,
   sizes/checksums and access policy; verify an approved retained copy or
   independent restore path in an isolated bucket. Never treat a database
   recovery copy as a media backup. Only after explicit
   migration approval use the clean pinned checkout and the confirmed
   direct credential to run `pnpm exec prisma migrate deploy`. Verify
   `pnpm exec prisma migrate status`, schema compatibility, the four
   nullable dealership fields, and unchanged existing records. Before
   staging, grant application access as the new migration role, which
   owns the new objects:

   ```sql
   GRANT SELECT, INSERT, UPDATE ON TABLE public."Dealer" TO kuraishi_v1_runtime;
   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."Vehicle", public."MediaUploadIntent" TO kuraishi_v1_runtime;
   GRANT SELECT, INSERT, DELETE ON TABLE public."VehicleChange", public."VehicleMedia", public."MediaAsset" TO kuraishi_v1_runtime;
   GRANT SELECT ON TABLE public."Inquiry" TO kuraishi_v1_runtime;
   GRANT SELECT, INSERT ON TABLE public."InquiryNote" TO kuraishi_v1_runtime;
   ```

   Verify these grants on the pooled login, including the dealership
   table lock; keep the inquiry write, rate-limit and delivery tables
   inaccessible for review. The exact chain and these grants passed on
   synthetic PostgreSQL 18.7 using the scoped direct and runtime roles.
   The test did not use Production data or a recovery copy. The
   migrations do not change Better Auth table definitions (89 catalog
   entries match the migrated rehearsal). Existing code is expected to
   keep serving, but database DDL can block briefly. Keep the write freeze
   until checks pass. On failure stop, preserve the current ledger and
   inspect whether DDL partially applied. Reconcile or restore only with
   explicit approval; do not blindly retry, resolve, reset, seed or run
   reverse SQL.
4. **Build without moving domains.** After explicit authorization, verify
   the clean pinned SHA, project link and Production settings. Run
   `vercel deploy --prod --skip-domain`; confirm Ready, exact source SHA
   evidence, Production target, and that `www` still serves the old
   deployment. Check protected generated URL and `/api/health` where
   possible. This URL is not the final auth origin; perform Better Auth
   sign-in only on `www`. Do not automatically promote on a successful build.
   If approved, stage the fallback the same way before promoting V1. Do
   not run its older migration bundle.

   Build safety (both pinned revisions): the install hook is
   `prisma generate`, the build hook is `next build`, and the verified
   project has no custom install/build override. Public data layouts and
   the sitemap opt out of static rendering. As a second safeguard,
   override both `DATABASE_URL` and `DIRECT_URL` with loopback-only
   placeholder URLs via `--build-env` (not runtime `--env`); verify the
   effective override in a build without a Production connection.
   Never run a migration hook during install, build or deployment.
   Do not bind a new review build to the potentially shared owner login.

   From each clean checkout, after the runtime connector is approved:

   ```powershell
   $buildDb = 'postgresql://build_only:unused@127.0.0.1:1/build_only?connect_timeout=2'
   vercel deploy --prod --skip-domain --project prj_nQ4GyGpomFCQPPuEsMtHVUyC0kyD --build-env "DATABASE_URL=$buildDb" --build-env "DIRECT_URL=$buildDb" --yes
   ```

   Vercel CLI 67 documents separate build (`--build-env`) and runtime
   (`--env`) inputs. Use only `--build-env` for the dummy URLs. Both
   revisions read server-side `process.env.DATABASE_URL` for Prisma at
   runtime and use `DIRECT_URL` only in Prisma CLI config. Neither
   revision inlines these values through `next.config` or `NEXT_PUBLIC_`.
   Keep the real migration connector in the operator vault, not in the
   new deployments. Removing the legacy saved `DIRECT_URL` requires
   separate approval and a consumer check. Verify after staging:
   current alias unchanged, generated URL gated, `/api/health` succeeds
   behind the gate with the actual pooled connector, and inquiry intake
   returns the disabled response. Do not use CLI `--verify`: it can
   create an automation bypass secret. This is a configuration review,
   not evidence of provider runtime separation on a deployed build.

   **2026-11-26 staging evidence:** Both exact revisions are Ready
   and unassigned. The approved pooled `DATABASE_URL` passed private
   authentication and hosted readiness on both builds; the real
   migration credential was not sent to Vercel. New deployments
   override the legacy runtime `DIRECT_URL` with a disabled non-secret
   value without changing the saved variable. An authorized first-run
   insert initialized one Production dealership record. The protected
   homepage, catalog and health checks returned `200` on both builds;
   real inquiry intake returned the expected `503`. After approval,
   enabled All Deployments protection, published the two reviewed
   indexing rules, and verified them before promoting
   `dpl_GZx9SE3v7Hv5Mb3sk4S91Rut9Vyo`. The `www` administrator login,
   public and admin reads, `/api/health`, intake off-state, noindex and
   sitemap suppression passed. The fallback deployment is
   `dpl_2xmgyjyxLkKH6voVwiic9HCaAvGG`, unassigned and protected.
   If rollback is approved, promote that exact deployment with the
   protection and routing rules left on; do not run its migrations.
   Recheck `www` sign-in after promotion. After separate handoff
   approval, grant named Vercel access for `www` without a bypass link,
   provision a separate app account with the approved role, and deliver
   initial credentials through the operator's approved private channel.
   The owner first signs into Vercel and then signs into `/admin` on
   `www`. Verify both layers using the owner's account after handoff.
5. **Protect, then promote.** In the approved window, enable All
   Deployments and verify logged-out requests cannot reach app HTML or APIs
   via `www`, apex (including redirect target), default hostname or
   generated URLs. Review exceptions and bypass grants. Publish approved
   temporary [project routing rules](https://vercel.com/docs/cli/routes)
   covering every host serving V1: a host-agnostic `/:path*` header rule
   sets `X-Robots-Tag: noindex, nofollow`, and an exact `/sitemap.xml` rule
   returns a 404 with no sitemap body. Snapshot the prior rules before
   publishing. Do not rely on Production's `robots.txt` to block indexing.
   Auth is the primary access control. The exact Production build
   normally permits indexing and publishes a sitemap; Preview behavior
   does not carry over. Check authenticated page headers as well as clean
   browser access; if controls cannot be verified, do not proceed. Only
   after domain-cutover approval use `vercel promote <verified-deployment>`.
   Recheck aliases, HTTPS, access and indexing immediately; keep protection
   in place on failure.

   From the verified Production project link, check
   `vercel routes list --production` and `vercel routes list --diff`
   before touching the draft. Stop if it contains unrelated edits. After
   authorization to stage the rules, use these commands (staging only):

   ```powershell
   vercel routes add "V1 review noindex" --src "^/.*$" --src-syntax regex --set-response-header "X-Robots-Tag=noindex, nofollow" --yes
   vercel routes add "V1 review sitemap off" --src "/sitemap.xml" --src-syntax equals --action set-status --status 404 --set-response-header "X-Robots-Tag=noindex, nofollow" --yes
   vercel routes list --diff --expand
   ```

   Check for a usable sitemap on `/sitemap.xml`, with a query string, and
   through normalized path variants. Verify the review header is effective
   on app responses, including HTML that still contains the original
   indexable metadata. If the edge rules are insufficient, stop and
   prepare a separately verified revision; do not promote the pinned builds.

   Draft `a1e17acb-6fdc-434e-bedb-92e859edc529` is staged, not
   published. Its authenticated hostname returned `200` with the
   review header at `/`, and `404` without XML at `/sitemap.xml` with
   and without a query string. Anonymous requests redirected to the
   hosting gate. This tested the draft over the existing deployment;
   the same controls still need verification on both pinned builds.

6. **16.14: internal Production smoke.** Verify revision, access gates,
   `/api/health` = `200` and `{"status":"ok"}`, app log-in/logout and
   staff scope on `www`, catalog/detail status, settings and inbox. Confirm
   no real inquiry intake: an approved payload-free `POST /api/inquiries`
   inside hosting auth returns 503 without creating a row; confirm no
   delivery or callbacks. Do not re-enable intake for a test. With separate
   authority to write the approved business card, use Admin Settings to
   create or reconcile exactly one dealership record. Read back the legal
   name, brand, legal form, activity, address, all three telephones as
   phones, email and website; check Contact, footer, About, Impressum and
   vCard where applicable. Do not copy any review DB rows, accounts or
   media; omit unprovided business/legal details. Readiness is not a full
   media test: any private upload/public-copy smoke needs separately
   authorized disposable fixtures and cleanup. Public-read objects are
   outside Vercel protection; use no personal data in fixtures.
7. **16.15: release record or rollback.** Record revision/ID, alias mapping,
   recovery reference and expiry, migration ledger outcome, ordered smoke
   evidence, operator and go/no-go decision. On failure suspend handoff;
   restore the approved, schema-compatible and auth-safe deployment while
   keeping the gate closed, or leave access gated and roll forward.
   `7fdcc66` is the current availability baseline, not an auth-safe
   rollback. `d942bf1` includes credential-form hardening and passed 17
   focused tests on its archived source. Its Prisma schema only lacks
   the four nullable fields; no down-migration is needed or intended.
   Stage it with `--prod --skip-domain` only after approval and verify
   readiness using current credentials and the migrated schema. Do not
   use its missing business-card fields or older copy as accepted owner
   review. Do not revert the database for a code
   rollback; restore it only under separate approval after accounting for
   intervening writes. Restore media independently and reconcile references.
   Restore prior public access only with a separate decision and only after
   verifying that no unapproved V1 content can be served.
8. **Owner access.** Follow the [named owner access procedure](#named-owner-access-1615).

### Named owner access (16.15)

For every Leads release, sign in as ordinary staff and verify that the
**Leads inbox** and its list or empty state actually render. Check that the
admin error panel is absent; the stream can return HTTP 200 even when the
inbox fails. Perform a synthetic search and check the rendered result, the
clean URL, and the deployment's runtime logs. Open a protected detail only
if suitable data already exists. Never create Production fixtures for smoke
tests; prove populated detail and note creation on a disposable database
through the restricted login in `test:inventory-db`.

**16.14 verification, 2026-11-26:** On live deployment
`dpl_GZx9SE3v7Hv5Mb3sk4S91Rut9Vyo`, an existing ordinary staff account
authenticated and opened Dashboard, Settings, Vehicles, Media and Leads.
Create account was absent from its account menu, and directly opening the
account creation URL returned to Dashboard. Business data was not changed.
Production had no vehicle or media object; populated detail, media CRUD
and direct action-denial checks remain isolated evidence. The code-only
fallback `dpl_2xmgyjyxLkKH6voVwiic9HCaAvGG` remains protected and unassigned;
do not roll back schema or storage as part of a code rollback. Production
restore testing was waived, not verified.

**Provisioning, 2026-11-26:** The operator confirmed successful creation
of a separate ordinary owner account in the Production form. No invitation
was sent or hosting access granted during provisioning.

**Approved handoff, 2026-11-26:** The operator approved the confirmed
recipient, confirmed granting only the matching named Vercel request, and
reported that the owner signed into the protected website and the app
dashboard. Independent unauthenticated probes of `/`, `/admin` and
`/api/health` returned `302` to Vercel authentication. Task 16.15 is closed
for protected review, not for public launch.

1. Confirm the recipient's name, app sign-in email, and Vercel identity if
   different. Privately sign in as the existing app administrator. Use
   **Create account** at `/admin/accounts/new` to provision a new ordinary
   account for that owner. Use a unique initial password entered privately;
   never copy an old account, share the administrator password, or elevate
   the owner for media approval.
2. Obtain final handoff approval before contacting the owner or granting
   access. Ask the owner to sign in to their own Vercel account, open
   `https://www.kuraishicars.com` and choose **Request Access** if prompted.
   In Vercel, open the project's **Settings → Deployment Protection →
   Requests** (or the deployment **Share** dialog), verify the requester
   against the approved identity, and approve only that named request. Check
   it under **Access**. See [Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication).
   Do not grant a paid seat, team membership, or a shared bypass link.
3. Give the owner the [German/English guide](./V1-Customer-Review-Guide.md)
   and deliver the unique app credential through the approved private channel.
   Verify that the owner can load `www` using their named Vercel access and
   reach Dashboard with their separate app account. Verify a signed-out
   browser still cannot access `www`. Leave indexing, sitemap, inquiries and
   external email disabled. Record the result without credentials; keep
   16.15 open until approval and both access checks are recorded.

### Inquiry privacy, retention and operator erasure (Phase 4)

**Draft for dealership and qualified privacy approval.** The German inquiry
notice on `/datenschutz` is not approved by this procedure. Review the controller
and rights contact, proposed Art. 6 bases and balancing, actual recipients and
processor agreements, transfers and safeguards, and the final retention criteria.
The [EU GDPR (Arts. 5, 6, 12–13, 15–22, 28, 44–49 and 77)](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
and [Austrian Data Protection Authority guidance](https://dsb.gv.at/rechte-pflichten/ihre-rechte-als-betroffene-person)
are the starting points, not approval of the draft.

- Keep each notice body and acknowledgement under its immutable version in
  [the notice registry](../src/content/de/inquiry-privacy.ts). The form links to
  `/datenschutz?version=<version>`; an inquiry stores the server-owned version,
  exact acknowledgement and time. Assign a new version when any notice content,
  controller contact or acknowledgement changes. Retain the old versions and
  their review records. The Phase 1–3 `2026-11-19-v1` value recorded a checkbox
  only; do not claim a versioned full policy was shown for it. Until approval,
  Production keeps the existing public Datenschutz page and does not serve the
  draft at its versioned URL. Review the draft only in synthetic mode.
- Keep both inquiry modes off in Production until Phase 4C authorization.
  Synthetic testing uses `INQUIRY_TEST_MODE=true`, an isolated database, and a
  `.invalid` address on `localhost:3000` or the exact protected Vercel Preview
  deployment host. For a manually staged Preview, `BETTER_AUTH_URL=auto`
  uses the exact provider-assigned `VERCEL_URL` as the auth origin.
  Live intake additionally requires the canonical Production
  host and origin, `INQUIRY_LIVE_MODE=true`, the exact approved
  `INQUIRY_APPROVED_NOTICE_VERSION`, and a stable private `INQUIRY_HASH_SECRET`
  (at least 32 characters). Never set an approval value for an unresolved draft.
  Live acceptance does not create notification rows; keep email and the worker
  off. No database migration or notification write grant is needed.

#### Proposed review schedule (not a legal requirement)

| What | Proposed operational rule, subject to approval |
| --- | --- |
| Inbox | Named staff check on business days and reply manually. Review unresolved leads weekly; review New or In progress after 30 days from receipt and close if no purpose remains. |
| Closed | At a monthly review, propose deleting Closed inquiries received more than 90 days ago where follow-up has ended and there is no hold. Do not interpret `updatedAt` as closure time. A policy based on elapsed time since closure would require a separate `closedAt` design. |
| Erasure and holds | Route promptly to the authorized operator. Verify the requester proportionately and assess the scope and applicable response deadline (GDPR Art. 12). Document the reason, reviewer, restricted access and next review for a hold; a hold is not indefinite. Do not wait for the monthly review to process a valid erasure request. |
| Rate-limit buckets | The 15-minute window is quota validity, not physical retention. Intake sweeps up to 100 expired rows after a successful transaction. Include a weekly operator sweep if there are expired rows, including during idle periods. No scheduler or new service is needed. |
| Copies | Apply approved rules separately to mailboxes, sent mail, exports, logs and recovery copies. Track each recovery copy's purpose, access and expiry. Review old branches and snapshots separately; never delete one as part of lead erasure. |

#### Authorized operator erasure

1. Use the approved direct database connection and operator role, never the app
   runtime role. In the control plane verify project, branch, endpoint, database
   and expected operator role. Verify the direct connection host privately; do
   not print its URL. In a read-only transaction check `current_database()`,
   `current_user`, and the expected inquiry foreign keys. Confirm the right
   tenant and environment before querying candidate IDs.
2. Resolve a request to an exact inquiry ID in the protected inbox and check the
   approved retention rule or erasure request and any hold. **Dry run (default):**
   in `BEGIN READ ONLY`, preview only the ID, status, receipt time, vehicle
   existence, and note/outbox counts. Do not export contact details, messages or
   note text. Confirm exactly one target and `ROLLBACK`. Obtain explicit approval
   identifying the target environment, case/ID and permitted operation before
   any permanent deletion. Any discrepancy or hold means stop.
3. Use a fresh transaction, set a short lock/statement timeout, lock the exact
   lead and recheck the preview under that lock. In a private `psql` session,
   set `inquiry_id` to the approved opaque ID; `:'inquiry_id'` quotes it as a
   SQL literal. Run the steps interactively or separately, not as an unattended
   script. For a read-only dry run, run just the second `SELECT` inside
   `BEGIN READ ONLY`.

   ```sql
   BEGIN;
   SET LOCAL lock_timeout = '5s';
   SET LOCAL statement_timeout = '30s';
   SELECT id FROM public."Inquiry" WHERE id = :'inquiry_id' FOR UPDATE;
   SELECT i.id, i.status, i."createdAt", i."vehicleId",
          EXISTS (SELECT 1 FROM public."Vehicle" v WHERE v.id = i."vehicleId") AS vehicle_exists,
          (SELECT count(*) FROM public."InquiryNote" n WHERE n."inquiryId" = i.id) AS notes,
          (SELECT count(*) FROM public."InquiryNotification" o WHERE o."inquiryId" = i.id) AS notifications
   FROM public."Inquiry" i WHERE i.id = :'inquiry_id';
   ```

4. Proceed only if one row and the displayed values match the approved scope.
   Record the vehicle ID transiently if present; never delete the vehicle. Run
   the deletion and verify while still inside the transaction:

   ```sql
   DELETE FROM public."Inquiry" WHERE id = :'inquiry_id' RETURNING id;
   SELECT
     (SELECT count(*) FROM public."Inquiry" WHERE id = :'inquiry_id') AS inquiries,
     (SELECT count(*) FROM public."InquiryNote" WHERE "inquiryId" = :'inquiry_id') AS notes,
     (SELECT count(*) FROM public."InquiryNotification" WHERE "inquiryId" = :'inquiry_id') AS notifications;
   -- If the preview had a linked vehicle, use its exact ID as the vehicle_id variable.
   SELECT EXISTS (SELECT 1 FROM public."Vehicle" WHERE id = :'vehicle_id') AS vehicle_preserved;
   ```

   Expect one deleted ID, zero inquiry/child rows, and the vehicle still present
   if it existed. `ROLLBACK` on any mismatch; `COMMIT` only with the explicit
   approval already recorded. Recheck the counts after commit. Rehearse deletion
   and rollback only in an isolated database with synthetic leads. Do not perform
   even a rollback-based delete rehearsal against Production.
5. Record an access-restricted audit reference, operator, date, approval/reason
   code, environment, counts and outcome, not the deleted content. Keep the
   minimum opaque ID mapping only as long as needed for approved recovery and
   erasure handling. Remove approved mailbox copies separately or document the
   specific exception. If restoring a backup, keep it isolated, check the
   recovery target, reconcile and reapply recorded erasures before reopening
   access, and check any new backup branch created by restoration.

For rate-limit cleanup, preview only `count(*) WHERE "expiresAt" <= now()` using
the same target checks. Authorized maintenance may delete expired rows in
bounded batches using the existing expiry predicate and lock pattern in
[inquiry intake](../src/lib/inquiry-intake.ts); never include current quotas or
log the pseudonymous keys. Recheck the expired count and stop or retry on a lock
timeout. This is separate from inquiry erasure.

### Recovery resource proposal and acceptance (16.12)

The Frankfurt Free project has six of ten branch slots in use and its
only manual snapshot slot is occupied by `snap-royal-surf-b976qnpq`
(2026-11-15, no expiry). Do not remove it. Propose a seven-day,
no-compute branch named `main-before-v1-migration`, taken immediately
before migration while affected writes are frozen. Explicitly set project
`twilight-bread-36837209`, parent `br-damp-shape-b9jjarf6`, approved UTC/LSN
and expiry; omit endpoints. Verify the returned parent, point, expiry
and empty endpoint list. Do not mount the retained copy into Vercel,
development or customer review. Recheck storage and compute allowance
immediately before creation. The estimate is $0 incremental Neon plan
charge within current Free quotas; a branch uses a slot, shared data can
consume storage allowance, and a verifier consumes compute allowance.
No plan upgrade, paid destination or quota expansion is approved.

**Approved preparation copy (2026-11-26):**
`main-before-v1-migration-preparation` (`br-snowy-base-b9rdq5rh`) is Ready
in `twilight-bread-36837209`, with parent `br-damp-shape-b9jjarf6` at LSN
`0/1F13410` (`2026-11-26T13:51:22Z`). Neon reported zero computes and
expiry `2026-12-03T13:51:23Z`. The existing snapshot was not changed.
This confirms creation and isolation from SQL endpoints, not successful
restoration or a final write-frozen rollback point. Do not attach a
compute to this branch. Refresh and verify the cutover point if data
changes or the copy will expire before the release window ends.

Restore into a second, disposable verifier, not the retained source or
Production. An unprotected parent can copy role passwords. Do not attach
a network-accessible compute where inherited credentials could grant
access. Prove that the chosen isolation control is effective before the
verifier can accept connections; otherwise use a custom-format encrypted
logical dump in an approved restricted vault and restore to a private,
network-isolated Postgres instance with fresh credentials, no restored
login roles and no application linkage. Use the same major version, compare
the expected database, ledger, auth schema fingerprint, aggregate counts
and approved grants, then run the pinned chain on the verifier and
measure recovery time. Record results only, not rows, credential hashes or
object identifiers that contain personal data. Remove the verifier at the
approved time. If the migration is delayed or writes resume, take and
verify a fresh point in the authorized window; do not treat an older
practice backup as the cutover recovery point.

**Restore verification waived for this V1 release (2026-11-26):** The
owner declined paid infrastructure. The Free project has no
verified private network or IP allowlist for a verifier. Neon documents
those controls on Scale, and does not guarantee that an inherited
password can be replaced before a first reachable endpoint in this
setup. Do not expose a clone to test that assumption. The current agent
host is not an approved Production-data restore destination. The
no-upgrade path needs an approved operator-controlled, network-isolated
PostgreSQL 18 runner with an encrypted volume/vault and private
credential injection. From the retained point, use an access-restricted
source path before any export; a new live dump instead verifies a new
point, not this exact copy. Restore with `pg_restore --single-transaction
--exit-on-error --no-owner --no-privileges`; apply audited grants
separately. Record only pass/fail, aggregate counts and elapsed time.
Do not treat the fresh media project as a database verifier.

Retain the original no-compute branch and manual snapshot. The
scope change does not authorize exposing a clone, using real data on
the shared host, or proceeding without a usable recovery point. If a
rollback is needed, stop writers, preserve the current ledger and
data, and seek separate restore authorization. The six-hour Free
history may expire before diagnosis; recovering from the retained
copy after that may take longer, must use an approved restricted
path, and can lose writes made after its LSN. A successful synthetic
rehearsal does not reduce this uncertainty about the actual copy.

Object storage is separate. Neon can store a versioning configuration
without enforcing object versions. Use a distinct private, access-
restricted destination in the approved region for both source buckets
if objects exist. Capture a private manifest of sizes, strong checksums,
content types and original access levels, and verify an independent
restore sample and its database references in isolation. If a safe
read-only inventory proves both buckets empty, record the counts and
policy instead of copying nonexistent objects. Do not clone a public-read
bucket into another public bucket.

**Media recovery preparation (2026-11-26):** Both Production source
buckets were listed recursively with authenticated read-only access;
`kuraishi-production-private` and `kuraishi-production-public` each
contained **0 objects / 0 bytes**. The private destination is the
independent Frankfurt Free project `morning-fire-32011635`, root
`br-fancy-unit-bhvjvfzi`, with no Production parent. Buckets
`kuraishi-recovery-private-source` and `kuraishi-recovery-public-source`
both read back as private and empty. Unauthenticated listing and object
GET probes returned HTTP 403 for both. The unused SQL endpoint was
removed; no compute endpoints remain. Provider-created default
credentials are scoped to this branch; no secret values were retrieved,
and no backup transfer credential was issued.

Expected incremental storage and transfer charges for the observed
empty inventory are zero; no objects were copied or restored. Recheck
source totals after uploads are frozen. If nonempty, confirm effective
destination access (including project principals), encryption, capacity,
retention, and cost before transfer. Use short-lived, separate
source-read and destination-write access; verify the destination with
signed checksums and an isolated restore test before relying on it.

### Production credential replacement contingency

The prior operator records attest to independently generated Better Auth
secrets and the saved Production storage mapping; current Vercel metadata
shows separate Production-only entries. Preserve those credentials unless
records are stale or evidence establishes reuse, exposure, or expiry.
Neon shows `dev` descends from the unprotected `main` and the Production
role was updated after the fork. This supports but does not prove password
non-reuse: hold release unless trusted records prove it or a separately
authorized replacement resolves it. Never test the exposed password.

| Credential | Known consumers and interruption | Separately authorized replacement and recovery |
| --- | --- | --- |
| `DATABASE_URL`, `DIRECT_URL` | Current and historical Production deployments retain their runtime env; Prisma migrations/backup tools use the direct connector. Check operator vaults, DB clients, jobs and external CI as well. A reset of the serving identity can drop connections and break deployed login. | Prefer a fresh least-privilege pooled runtime login and a separate direct migration/backup identity, with grants verified against the migrated schema and app flows. Stage fresh Production values and both protected candidate/fallback deployments before moving traffic. Preserve schema ownership; after consumer cutover revoke the superseded login or rotate its credential, not its owned objects. If overlap is unsafe or infeasible, use a separately approved short maintenance cutover with a ready build/recovery plan. Never restore the exposed password. |
| `BETTER_AUTH_SECRET` | Session cookies and auth state are tied to the deployment secret. Pinned app config reads one secret; a change can force reauthentication. | If required, use a newly generated independent secret on both protected deployment candidates. Plan operator/owner re-login and explicit session revocation if exposure is suspected; verify no mixed-secret traffic and recheck staff access. Do not restore a suspected secret. |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Production media handlers/readiness, outstanding upload intents or signed reads, and approved backup tools. Older builds retain their original key; key expiry/revocation can interrupt access. | If required, stage a fresh read/write credential on only the dedicated storage branch, keep the same bucket policies, verify access and a scoped synthetic workflow, then retire the prior key after approved overlap. Freeze uploads and account for unexpired grants and incomplete intents; do not change bucket access as a workaround. |

No automatic scope expansion to the legacy Preview, review project or
recovery clones. Record exact consumers and old/new deployment IDs. If a
new deployment fails, keep access gated and use the hardened fallback
built with the current credentials, not an old artifact with stale
secrets. Scope/discovery evidence is not runtime authentication evidence.

On the verified Production `main` PostgreSQL 18 target, created
`kuraishi_v1_runtime` and `kuraishi_v1_migration` with `NOLOGIN` and
verified their current schema and table grants. Neither role belongs
to `neon_superuser` or another role. The direct role can create its own
tables, types, indexes and trigger functions; it has only the required
ledger DML and `REFERENCES (id)` on the existing `user` table for the
pinned migrations. Do not transfer ownership of existing auth tables
or grant the current owner's role. Use separate restricted backup access
for an export; the DDL login does not have read access to the auth data.
The pooler role has no DDL or ledger
access. No existing or pinned migration-created sequences need grants.
For future app objects, grant operations explicitly when the migration
creates them; do not give defaults that expose every future table.
Catalog readback also identified existing database-level `PUBLIC`
`CONNECT` and `TEMP` privileges on the app and `postgres` databases.
Those are not grants to either role on application objects; do not alter
shared `PUBLIC` privileges as part of this credential cutover.

Activate each login with an independently generated secret held in the
approved operator vault, then verify pooled and direct authentication
and negative privileges. First rehearse the 12 migrations under the
direct role on the migrated-schema verification path: compare owners and
ledger, apply per-table runtime grants for inventory, settings, media and
staff inbox, and test actual app workflows. Keep disabled inquiry intake
and delivery writes out of this grant set. If a later migration needs
ownership of an existing auth object, obtain a separate scoped grant or
owner-executed change instead of extending runtime privileges.

Separately approve the Production Vercel connector updates, traffic
cutover and retirement of the superseded login. Confirm current and
historical Vercel deployments, Prisma/backup operators, external CI,
scheduled jobs and operator vault clients. The database activity sample
showed only the current owner name; it cannot establish that no external
or intermittent consumers exist. Keep the owner credential untouched
until those consumers and rollback builds are accounted for. There is
no confirmed reason to rotate Better Auth or storage credentials now.

#### Secure local activation of the two new roles

Use an operator-controlled workstation with PostgreSQL 18 `psql` and
an approved password manager. Generate two independent random
passwords of at least 32 characters in the manager and save them in
separate runtime and migration entries. On the shared agent host a
synthetic 256-bit RNG and Windows DPAPI CurrentUser round trip passed,
but that is not approval for storing real Production secrets. Do not
export a connection string with `neon env pull` or obtain a password
from a connector that returns it into the tool transcript.

The signed EDB 18.7 portable `psql`, `pg_dump` and `pg_restore` clients
were installed per-user and their versions verified. No server service
was installed. The native activation launcher verifies the endpoint
and role state, opens hidden prompts, then checks the two passwords
against the pooled and direct endpoints with separate sessions.
Hostname-verified TLS was preflighted with a trusted CA bundle; no
password was sent by automation.

The Neon control plane rejects the precomputed SCRAM verifier produced
by `psql \password`. Use the private launcher instead: it collects
the two new passwords with no-echo prompts before connecting, then
prompts for the existing Production owner password from the approved
vault (never the exposed Preview password). The new passwords are
passed to `psql` through stdin and sent to the verified direct
hostname `ep-silent-mountain-b966e9p0.c-7.eu-central-1.aws.neon.tech`
over hostname-verified TLS. They are not written to a file, command
line or transcript. The launcher checks session statement logging is
disabled and both target roles are `NOLOGIN` before setting their
passwords. It enables the two logins only after both password changes
succeed. It does not change the owner credential. On failure, recheck
both role states before retrying.

Retest using `psql -X -W` with the same database and TLS options: the
runtime role uses `ep-silent-mountain-b966e9p0-pooler.c-7.eu-central-1.aws.neon.tech`;
the migration role uses the direct hostname above. Report only
authentication success, role, database and catalog privilege checks,
not connection strings or query data. Confirm runtime schema `USAGE`
but not `CREATE`, auth CRUD, and no ledger access; confirm migration
schema `CREATE`, ledger `SELECT`/`INSERT`/`UPDATE` but not `DELETE`, and
`REFERENCES` on `user.id`. No Vercel changes are needed for activation.
After separate Vercel approval, transfer only the pooled URL to the
sensitive Production `DATABASE_URL` via a trusted vault-to-stdin pipe
or the private dashboard. Never pass a secret through CLI `--value`,
`--env`, or `--build-env`, or write a temporary plaintext `.env` file.

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

Executed on 2026-11-26 for `152742d366d47b5d3d6dd92e5218947206cea3bb`.
Ready staging deployment `dpl_EsqipZ16sP6ZtQx7TykBjNfutMDZ` now serves
the protected review alias. The prior Ready deployment,
`dpl_ESRoRqatdodL9hdA2UeLhSxnb7ia`, remains the rollback target.
The project retained all-URL Vercel Authentication. No migration,
environment variable change or customer invitation was performed.
Hosted homepage and ordinary-staff regression passed on the replacement.
Both synthetic ordinary staff accounts were signed out after testing;
include them and their fixtures in review-only cleanup. Do not reuse
temporary test accounts for the owner.

## Release evidence and rollback decisions (16.15)

Before deploying, record the exact candidate SHA, validation results,
approved rollback target, applicable migration range, and approved recovery
point from 16.12. Record who decides whether to stop, roll forward, or recover,
and who verifies each outcome. Do not include secrets or customer records.

| Area | Stop or recover when | Evidence and recovery boundary |
| --- | --- | --- |
| Application | Auth, health, or required smoke checks fail | Confirm the failing revision and choose the approved compatible code rollback or a reviewed forward fix. Recheck auth, health, and the affected flow after recovery. |
| Database schema | Migration fails, the ledger disagrees with the approved range, or validation shows incompatible schema | Stop before deploying the new code. Preserve current state and reconcile the migration ledger. Restore only with separate approval under 16.12 after accounting for later writes. The Free-plan V1 recovery point is checked for availability, not restore-tested. Do not run reverse SQL blindly. |
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
  changes; see the completed 16.12 Production migration and recovery record.

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

These tasks are separate from accepted protected V1 delivery. A docs-only
push is not a deployment. Do not change the live revision or rollback
deployment unless a confirmed requirement or separately authorized security
maintenance requires it.

- **High priority: exposed Preview database credential rotation.** Follow the
  coordinated cutover below. It has not been authorized or performed.
- **Old Production credential retirement:** Map and move remaining consumers
  and obtain separate revocation approval. The deployed V1 uses the new
  pooled runtime identity; do not test the exposed Preview password against
  Production or place the migration credential in runtime.
- **Synthetic account cleanup:** After the remaining browser checks, identify
  the exact temporary Preview staff and recovery accounts and their references.
  With operator approval, revoke their sessions and disable the credentials
  without deleting referenced audit history. Preserve any account still needed
  for authorized Preview access. The earlier recovery revoked the synthetic
  administrator's old sessions; final account cleanup is still pending.

- **Intermittent storage upload warning:** Keep the
  [next-occurrence protocol](#capture-the-next-hosted-preview-occurrence);
  do not change upload code without a confirmed defect.
- **Recovery expiration and retention:** Preserve existing snapshots and
  branches; verify recorded expiry and availability before relying on them.
  Review retention separately before any deletion or recreation. Production
  restore testing remains waived, not verified.
- **Unrestricted public launch:** Wait for the seven
  [business and legal decisions](./report.md#remaining-work) and separate
  launch approval. Until then keep Deployment Protection, indexing and
  sitemap suppression, and disabled real inquiry intake and external email.

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
