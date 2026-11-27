# First-Version Finalization Review

- **Reviewed:** 2026-11-20
- **Branch / revision:** `test/backend-integration-and-release` / `466f70e`
  **Checklist reviewed:** [Checklist.md](./Checklist.md), cross-checked with the [implemented-sections test guide](./Implemented-Sections-Test-Guide.md), [README](../README.md), and [operations runbook](./Operations-and-Recovery-Runbook.md).

## Contact and appointment requests: Phase 1 release

- On 2026-11-27, the approved Phase 1 changes (`CONTACT-003/004/006/007/008`, single success confirmation, and compact directions) were fast-forwarded into `master` at `476495dc1f6d47f77d1b554570b01fd871611b37`. Vercel deployment `dpl_hWH8b7naJMjQ8vqQubCjfiLPrXke` was Ready and promoted to `www.kuraishicars.com`. No database migration or Production configuration change was made.
- Verification passed: 141 source tests, 24 isolated integration tests, TypeScript, ESLint, Prisma validation, and an optimized build during implementation; 20 focused tests, ESLint, Prettier, and whitespace checks passed before release. The disposable review and integration databases were removed.
- Live read-only smoke verified homepage and navigation, Contact without horizontal overflow at desktop and mobile widths, the optional-message hint, the 44 px directions action, the Admin dashboard, Add vehicle photo controls, and an existing vehicle gallery. Anonymous requests remained protected, Contact returned `X-Robots-Tag: noindex, nofollow`, and `/sitemap.xml` returned 404 behind protection. Inquiry intake remained disabled and external email delivery was not enabled. The calendar, validation, retry, and successful submission flows were exercised only in isolated testing.
- **LEADS-003 resolved on 2026-11-27:** The Production runtime role lacked read access to `InquiryNotification` (SQLSTATE `42501`, also present on the previous deployment). The table owner granted `kuraishi_v1_runtime` column-level `SELECT` on `id`, `inquiryId`, `status`, `attemptCount`, `lastErrorCode`, `nextAttemptAt`, and `sentAt` only. No table-wide read access, write access, or schema privileges were added.
- The live inbox and empty-result search passed under an ordinary staff session. A populated detail was verified with the restricted role in isolation; Production had no inquiries. Vercel recorded no Leads runtime errors during the post-fix checks. No schema migration, data write, credential change, or redeploy was needed.
- For future releases, seed isolated fixtures as the owner, then test Leads list, search, detail, and staff-note creation through a separate role with the Production grants. Assert that notification writes and non-UI columns remain denied, and verify that the hosted inbox content renders rather than relying on HTTP status alone.

## Vehicle-photo simplification

### Accidental sale correction

- On a Sold vehicle, open **Vehicles → ⋯ → Return to draft** and confirm.
  The vehicle is hidden from the public and removed from the sold count.
  Its details, photos, and sale correction history remain intact. Publish
  it explicitly after review; no database migration is needed.

### Add/Edit Vehicle follow-up

- Drafts retain a staff-only **Feature on publish** choice. Publication
  applies it to the existing Featured flag and clears the draft choice.
  Published vehicles can be featured or unfeatured from the editor.
- The **Inspection** dropdown replaces the separate confirmation checkbox.
  Only Passed permits publication. As specified in the lifecycle policy,
  changing inspection away from Passed on a Published or Reserved vehicle
  returns it to Draft and clears public placement in the same save.
- **Save and preview** saves the vehicle and its photos before opening the
  protected preview. A failed save keeps the form open with its values intact.
- The additive draft preference migration defaults existing vehicles to no
  draft preference and leaves the existing Featured flag unchanged.
- Local verification passed: 140 source tests, 30 inventory/database tests,
  three vehicle-photo/storage tests, Prisma validation, TypeScript, ESLint,
  changed-code formatting, and an optimized build. With ordinary staff and
  synthetic data, the mobile form created a draft with a photo and opened the
  saved preview. Desktop testing verified persisted publishing settings,
  input retention with a simulated save failure, and a single update request
  on a double click. The preview showed the updated model and loaded its photo.

- [x] **Production inventory and storage preflight (2026-11-27, read-only).**
  Production had zero vehicles, zero photo associations, and no active upload
  intents. The database had 11 unattached private image records and four
  unattached public image records; the two buckets contained 11 and four
  objects respectively. Each public copy matched its private original's key
  suffix, size, and ETag. No objects were downloaded or changed. Recheck all
  counts and compare key sets under a write freeze before cutover.
- [x] **Additive photo data backfill.**
  The additive `20261127100000_backfill_vehicle_photos` migration introduces
  one private object reference per owned photo and preserves existing photo
  IDs, vehicle ownership, ordering, and image metadata. **Do not deploy the
  migration independently**: a
  backfill performed while legacy writes remain enabled would miss later
  associations. Keep the migration pending until the replacement flow is ready.
  The isolated media migration suite passed all 12 tests, including populated
  private and public attachment backfill and exclusion of unattached images.
  Prisma schema validation, TypeScript, ESLint, all 151 source tests, and an
  optimized local build passed.
- [x] **Vehicle-owned photo flow and removal of the standalone library.**
  The feature branch replaces the library with the vehicle editor's **Photos**
  tab. The first saved photo is the cover. The staff detail view shows all
  photos. Both image-serving routes read the private bucket; the public route
  rechecks public-detail eligibility on each request. Photo removal is saved
  with the vehicle and enqueues object deletion in the same transaction.
  Completed but unclaimed photos expire after one hour; a later upload
  sweeps expired grants and retries failed object deletions.
- [x] **Isolated database, storage, and browser verification.**
  All 30 inventory regression tests and all three dedicated photo tests
  passed. The photo suite covered legacy data preservation, retirement
  guards, ordinary staff, failed saves, cancelled uploads, and publication
  access against isolated storage. Chromium verified multi-photo creation,
  add/remove/reorder during editing, cover selection, persistence after
  reload, and the staff and published galleries on desktop and mobile.
  Cancelling an in-flight browser upload returned `204`; the retired page
  and API returned `404`. The localized published gallery rendered both
  images in the optimized build without horizontal overflow. The isolated
  browser database and its recorded storage keys were removed.
  All 140 source tests, Prisma validation, ESLint, TypeScript, the optimized
  Next.js build, and the frozen lockfile check passed.
- [x] **Production authorization and cutover (2026-11-27).** Froze legacy writes
  and verified that staff, auth, inventory, and inquiry paths were blocked
  while protected public reads stayed available. Retained the Ready
  no-compute recovery branch `br-bold-butterfly-b90vahkd` at `0/2197200`
  through `2026-12-04T09:29:55Z`. The frozen inventory had zero vehicles,
  photo associations, and live grants. Both approved Prisma migrations
  applied on the direct connection; all 15 ledger entries were complete,
  the two new checksums matched Git, the legacy tables were absent, and
  the runtime role had the expected photo-table grants. Reverified each
  private original before deleting exactly the four approved public keys.
  Their old URLs returned `404`; all 11 private originals and both buckets
  remained.
- [x] **Production deployment and live verification.** Fast-forwarded Git
  `master` to `596b434609308543fd06e930c206eb15338af39c` and promoted the
  protected deployment `dpl_ELi1auzKiGNGTPypcdACu6myPcuS` to
  `www.kuraishicars.com`. Removed the temporary freeze. The signed-in
  ordinary staff account could open **Vehicles → Add vehicle → Photos**,
  with uploads enabled and no Media navigation. The old page and API
  returned `404`; the staff image endpoint returned `401` without an app
  session. The site remained gated for anonymous callers. Health and
  catalog returned `200`, `noindex, nofollow` remained active, the sitemap
  returned `404`, and inquiry intake and the email worker returned `503`
  in the disabled configuration. No Production test vehicles or photo
  uploads were created.
- **Cutover and recovery procedure.** Freeze legacy writes
  and capture an approved recovery point and restricted manifests of attached,
  unattached, and storage-only objects. For each attached private photo, verify
  its current private key. For each attached public photo, copy its bytes to
  `photo-migration/<asset ID>` in the private bucket and verify the copy against
  the source before applying the migration. Abort if any attached photo cannot
  be verified. After backfill, compare photo counts, IDs, positions, and private
  object references before retiring the legacy tables. Keep unattached private
  objects out of the new application and retain them for a separate decision.
  The selected plan is to retire the public copies only after independently
  verifying private replacements and receiving separate approval for deletion;
  leaving an object in a public-read bucket leaves its old URL readable.
  See the [vehicle photo cutover](./Operations-and-Recovery-Runbook.md#vehicle-photo-cutover)
  for the two migrations, the four exact keys, and deployment/rollback gates.

## V1 delivery milestone

**2026-11-26 — Delivered and accepted for protected customer review**, not
unrestricted public launch. The operator confirmed that the owner could open
[www.kuraishicars.com](https://www.kuraishicars.com) through named Vercel access
and sign in to the dashboard with a separate ordinary account. Anonymous
requests still required Vercel authentication.

| Record | Exact application SHA | Deployment |
| --- | --- | --- |
| Live on `www` | `152742d366d47b5d3d6dd92e5218947206cea3bb` | `dpl_GZx9SE3v7Hv5Mb3sk4S91Rut9Vyo` |
| Protected, unassigned code rollback | `d942bf177ea3a2a77f4dd1211a3d0690a9b5c404` | `dpl_2xmgyjyxLkKH6voVwiic9HCaAvGG` |

This documentation commit is not the deployed application revision. Keep both
deployments and recovery resources unchanged; Production restore testing was
waived, not verified. Deployment Protection stays on, indexing and sitemap
stay suppressed, and real public inquiries and external email stay off.
Feature development is paused pending owner feedback. The seven business/legal
items and [separate maintenance tasks](./Operations-and-Recovery-Runbook.md#outstanding-security-maintenance)
remain open. See the [German/English customer guide](./V1-Customer-Review-Guide.md).

## Executive status at the initial review

The core application is substantially implemented, but this branch is **not ready for a Production launch**. The remaining blockers are principally approved real data, legal/retention decisions, verified Production/Preview configuration, a reviewed Production migration/deployment procedure, and end-to-end release evidence. Email delivery is deliberately disabled for Production.

The source implementation and docs show working database-backed inventory, media, settings, inquiries, inbox/notes, dashboard, and public catalog/detail flows. The auth and inquiry paths reviewed here enforce server-side access and report an inquiry as saved only after the backend accepts it; the UI also says a requested appointment is not a confirmed booking. No new confirmed runtime defect was found in the source areas sampled. This is not a certification of Production resources or of browser behavior.

### Verification performed for this review

- Source tests: **139 passed, 0 failed** using the repository test command directly with Node 22.21.1.
- Isolated inventory migration/query suite: **30 passed, 0 failed** on 2026-11-20 (6 migration, 24 query tests) using the guarded isolated target.
- TypeScript typecheck: passed.
- Repository ESLint: passed.
- Running the `pnpm` scripts themselves aborted: this workspace's pnpm attempted to replace `node_modules` and stopped because the session has no TTY. No install or dependency change was requested. The equivalent test/typecheck/lint executables were run directly with Node 22.
- No browser/manual test, Production resource, deployment, or email send was run during this review. The inventory migrations were applied only to the guarded isolated test target. No environment secret values were read.

## Remaining work

**Seven business/legal items remain unchecked.** The three completed
Production gates are retained below for evidence. Four other items were closed
by explicit V1 scope decisions, not by implementing deferred features.

After each point is verified and marked complete in [Checklist.md](./Checklist.md), update this report in the same change: move the point to **Completed since the initial review**, tick it, record the verification result, and update the remaining count.

### Release gates and decisions

- [ ] **09.05 — Inquiry evidence retention/deletion.** Obtain business/legal approval for customer-data retention and deletion. Capturing the acknowledged notice text/version and timestamp is implemented; the retention period and deletion/anonymization procedure are not approved. This also blocks **11.07**.
- [ ] **14.01 — Truthful launch content.** Business-card details are available for protected review via owner-editable settings. Confirm them and approve final public claims before launch. Stock imagery is labeled illustrative, but its external-use policy remains unresolved.
- [ ] **14.03 — Final legal copy.** Qualified counsel must review and replace the placeholder imprint, privacy, terms, and cookie content before unrestricted public launch. The authorized invite-only review must keep the pending notices visible. See [legal-pages.ts](../src/content/de/legal-pages.ts).
  - **Independent 14.08 browser check:** At `0ce4cea`, all four localized legal routes returned HTTP 200 with distinct headings and the expected shared placeholder warning. Using a synthetic settings fixture at the Prisma boundary, the imprint address and contact links matched the fixture and the footer's shared details. All six service CTAs prefilled the expected inquiry type and the contact form stated that an inquiry is not a confirmed booking. No submission was sent.
- [x] **16.12 — Controlled Production migration.** The dedicated direct role applied all 12 approved migrations; all 13 ledger entries and checksums, constraints and scoped grants passed verification. See the [Production record](#main-domain-v1-readiness). Production restore testing was waived, not verified. The preflight notes below are historical evidence.
  - **Preflight (2026-11-24):** Release revision `18bf27c` contains 11 migration files not present in the deployed revision `7fdcc66`. The migration directory is unchanged from `055d5fc`, whose 11 pending migrations applied successfully on Preview `dev`. The Git comparison does not establish Production's migration history. Before any apply, verify Production migration status through the confirmed direct connection and approve a recovery point on Frankfurt `main`; the Preview recovery branch is not a Production backup. The new app requires exactly one approved `Dealer` record; do not copy the synthetic Preview row. No Production migration or recovery action was performed.
  - **Recovery console evidence (2026-11-24):** Frankfurt `main` shows a rolling 6-hour restore history window, one existing snapshot labeled `before-better-auth-production-migration-2026-11-15` with no expiry, and no snapshot schedule. Preserve the existing snapshot. Under the Free-plan waiver, verify the availability and freshness of the write-frozen recovery point before applying anything; restoration remains unverified.
  - **Production read-only checks (2026-11-24):** The migration ledger shows one row, `20261113214441_init_better_auth`, marked finished and not rolled back. The other 11 release migrations are not recorded as applied. A separate catalog query returned no matches for the ten new tables in `public`. These checks do not rule out other schema drift or confirm a recovery point.
  - **Recovery branch preflight (2026-11-24):** Reviewed the proposed `main-before-v1-migration` settings in the Console: parent `main`, current data and schema, and auto-delete `Never`. No branch was created and no release window is scheduled. Confirm the rollback procedure and retention before creating the branch immediately before the approved migration. Keep the existing snapshot unchanged.
  - **Proposed rollback procedure:** Record an exact pre-migration UTC timestamp or LSN on `main` and verify it with Time Travel Assist. Use `main`'s own history as the planned in-place recovery route while that point is available; this keeps `main` a root branch. The Console requires a root restore source, and restoring a root from another branch changes its ancestry. Keep `main-before-v1-migration` unchanged as a secondary recovery copy, not an in-place restore source or a Vercel target. If history has expired, stop and agree on a separately tested recovery procedure from the copy. Before any restore, pause writes, preserve the current database state, and account for changes since the restore point. Object storage is not rolled back; verify media references separately. Recommended retention is manual removal only after release validation and owner sign-off. This procedure is not approved for Production.
  - **Isolated restore drill passed (2026-11-24):** In the disposable `TEST_PROJECT`, the synthetic row read `after-change` before the restore and `before-restore` in the historical preview at `16:20 UTC`. After the approved restore from the test branch's own history, a fresh SQL query returned `before-restore`, and Neon listed the automatically preserved pre-restore branch as ready. This verifies the test procedure, not a Production backup or a recovery route after history expires. No dealership Production or Preview changes were made.
- [x] **16.14 — Protected Production smoke test.** The authorized read-only smoke passed, including existing ordinary-staff access and account-creation UI/route denial. Health returned `200` with `{"status":"ok"}` and checked both configured buckets, not uploads or public image delivery. No Production business records were written. See the [Production results and scope limits](#main-domain-v1-readiness).
- [x] **16.15 — Protected release, rollback evidence and owner handoff.** The exact deployed revision and rollback criteria are recorded; the reviewed commit range contained no detected secrets or demo customer records within the scope below.
  - **Repository preflight passed at `53434be8c2e84a33576d91bd86af76a4b0e2b196`:** 148 source tests passed with none skipped; TypeScript, repository ESLint, Prisma validation and generation, and an optimized Webpack build passed. The build used an exact Git archive, dummy loopback database/storage endpoints, disabled inquiry/delivery, and mocked font responses. No hosted environment, new browser session, or database integration suite was used for this preflight.
  - **Migration and config comparison:** 11 migration files were added since the recorded baseline `7fdcc66`; the migration files, Prisma schema/config, dependency manifest/lockfile and Vercel config are unchanged from the prior isolated migration evidence at `055d5fc`. This does not establish current Production state or prove reversibility. Added missing, empty media variables to the environment template and corrected the inquiry/delivery comments; no runtime configuration changed.
  - **Git and fixture checks:** The local scan of 31,306 added text lines across 145 commits (`7fdcc66..53434be`) found only seven synthetic matches for the credential patterns checked. No committed data dumps or demo customer records were identified in the checked paths; vehicle fixture tooling/tests and the unreferenced admin fixture module do not supply runtime dealer or inventory data. This review does not cover every encoding, binary, branch, or older history and does not resolve the exposed Preview credential. Do not copy isolated data into Production.
  - **Approved as a code rollback candidate only:** `d942bf177ea3a2a77f4dd1211a3d0690a9b5c404` contains the `43f0d88` sign-in hardening and has the same Prisma schema, migrations, configuration and dependency lock as `53434be`. Its previously recorded isolated integration evidence is 30/30 inventory tests and dashboard browser verification; public and inquiry-to-inbox results remain tied to their earlier tested revisions. The sole runtime code delta is the isolated notification worker's bodyless POST fix, absent in `d942bf1`; do not use it as-is if that worker becomes essential. `7fdcc66` remains unsuitable. See the [rollback criteria](./Operations-and-Recovery-Runbook.md#release-evidence-and-rollback-decisions-1615).
  - **Rollback candidate offline rerun:** At the exact archived `d942bf1` revision, 147/147 source tests passed with none skipped; TypeScript, repository ESLint, Prisma validation and client generation passed. No database or browser test was rerun and no migration was executed. Remaining items require scope/legal decisions, external configuration, or operational authorization; none was closed by this check.
  - **Handoff complete (2026-11-26):** The operator approved the confirmed recipient, granted named Vercel access and reported that the owner verified both `www` and `/admin` through their separate ordinary app account. Independent anonymous probes still required Vercel authentication. Live intake requires separate authorization; external email remains excluded from v1.
- [ ] **11.07 — Customer-data lifecycle.** Keep projections private and follow the approved inquiry retention policy; do not add a TTL, deletion, or anonymization rule before 09.05 is approved. Lead statuses, assignment, closure, and delete controls are separate CRM scope and are not implemented.

### Conditional consent verification

- [ ] **14.06, 14.07, 14.08 — Consent preferences and effects.** Conditional on qualified legal guidance. The cookie page currently has no preference controls, and no analytics/embedded iframe is present. Do not add a consent system or gate necessary auth before the decision; if consent is required for optional resources, implement and test the actual runtime gating.
  - **Pre-change baseline (14.08):** The anonymous legal pages set no cookies; the theme preference persisted across full navigation, and the cookie page had no preference controls. Before the local decorative-media change, the browser attempted Unsplash/Pexels requests; the harness blocked them. All 148 source tests passed with none skipped. This baseline does not establish legal compliance.
  - **Technical inventory prepared:** The [test guide](./Implemented-Sections-Test-Guide.md#21-section-1408--browser-storage-and-external-request-inventory) separates browser persistence, locally served media, direct and proxied third-party requests, and backend providers. Qualified approval of copy, business identity, and media/consent policy remains pending; no behavior changed.
  - **To close 14.08:** Obtain the approved business identity/contact details (14.01), page-specific text for all four pages (14.03), and the consent/media decision. If optional media must be gated, verify deny, allow, reopen, change/withdraw, and reload on the real resource paths, while preserving necessary staff authentication. If preferences are not required, record that decision and verify only approved resources load.

## Business and legal questionnaire

The dealership owner supplies and approves public business facts; qualified
counsel supplies or approves the legal decisions and text. The
[technical handoff for German legal drafting](./Implemented-Sections-Test-Guide.md#technical-handoff-for-german-legal-drafting)
prepopulates the confirmed processing, provider, session and lifecycle facts.
Mark unanswered or inapplicable fields explicitly. Provide approved public details and document
versions, not passwords, private records, or real inquiry samples.

| Checklist | Questions to resolve |
| --- | --- |
| **14.01 — Business identity and content** | What are the exact legal and display names, legal form, official address, public phone/email, website and opening hours (including appointment-only or holiday rules)? Which representatives, registration identifiers, tax/VAT identifiers and authorities should appear **if counsel says applicable**? Confirm which services, claims, ratings or figures are supportable, which contact/map/social links belong on the site, and that decorative images may appear as illustrations, not dealership premises or inventory. Who approves the final facts? |
| **09.05 — Retention policy** | What is the approved purpose and retention period for each inquiry category, contact details, message, vehicle snapshot, acknowledgement evidence, authored notes and notification metadata? What starts the clock, resets it if anything, and which exceptions or holds override it? Confirm the notice versioning and approved acknowledgement text; the evidence fields (text/version and timestamp) are already approved. What rules apply to backups, logs and any exports, and who approves the policy? |
| **11.07 — Operational lifecycle** | Who is allowed to review and execute deletion or anonymization, on what schedule or request, and who confirms it? Which linked data must be removed or de-identified, including notes, and what minimal audit evidence may remain? How are exceptions, customer requests, backups/restores and exports handled? Notes already follow the inquiry lifecycle; no separate TTL is planned. |
| **14.03 — Final legal pages** | Provide approved German copy and version/effective date for imprint, privacy, terms and cookie information, plus the exact inquiry acknowledgement and links. Confirm the responsible entity and privacy contact, and which disclosures the text must cover: purposes/data, providers and transfers, retention, rights and contact route. Confirm the terms describe the actual inquiry workflow, not a confirmed booking. Who signs off on the final copy? |
| **14.06 — Preference requirements** | Is a preference UI required? If yes, what categories, initial defaults, button labels and copy are approved? How should visitors reopen, change or withdraw a choice, and for how long may the choice persist? If no UI is required, record that decision and its scope. |
| **14.07 — Runtime effects** | For each entry in the [technical inventory](./Implemented-Sections-Test-Guide.md#21-section-1408--browser-storage-and-external-request-inventory), what may run before a choice, only after opt-in, or not at all? Include theme and comparison storage, necessary staff sessions, local decorative assets, public inventory media and outbound links. What must stop or be cleared on withdrawal and refresh? External mail and callbacks are excluded from v1. |
| **14.08 — Acceptance** | Confirm the owner-approved settings, counsel-reviewed copy versions, and the final preference/resource matrix or documented no-gating decision. Identify the reviewer for isolated acceptance of page-specific text, contact consistency, service-link context and any approved preference effects. |

## Checklist and evidence that need reconciliation

1. The checklist’s **Review-wide findings** and **Coverage register** are stale relative to later completed sections. They still describe no business API, fixture-based sitemap/search/comparison, fake settings save, fixture leads, and placeholder dashboard metrics, while later sections and current source describe database-backed implementations. Update these as current-state documentation, not as new feature work.
2. The isolated inventory suite and the section-specific browser retests have passed for 06.10, 07.05, 08.09, and 12.08. Continue to distinguish **source test**, **isolated DB test**, **browser test**, and **Production test**.
3. Keep the seven pending business/legal items open. Treat the four excluded/deferred items below as closed scope decisions, not shipped functionality.
4. The test guide records a full-repository Prettier check finding 148 pre-existing unformatted files. Avoid mass-formatting unrelated files; decide whether that baseline is an accepted limitation or a separate cleanup task.

## Recommended closeout order

1. Keep the [delivered protected V1](#v1-delivery-milestone) unchanged during owner review. Wait for feedback before starting feature development.
2. Use owner feedback and the questionnaire to finish business, retention and consent decisions before unrestricted public launch.
3. Keep the verified 16.11 environment configuration unchanged unless a separate change is approved.
4. Preserve isolated database/browser results at their tested revisions. The high-priority [Preview cutover plan](./Operations-and-Recovery-Runbook.md#coordinated-preview-database-credential-cutover) specifies an in-place `dev` owner reset, the confirmed protected Preview SHA and stale-deployment impact. The former Section 02 inventory backup was replaced locally with an ignored, value-free note under explicit approval. The proposed November 27, 21:00-23:00 CET window is not authorized: verify actual recovery clone expiry and confirm external consumers and test-clone retention. Possible Production reuse remains separate and unresolved; no database password was tested or changed. The HTTP 204 / `net::ERR_ABORTED` warning and hosted synthetic-account cleanup remain open.
5. Keep unrestricted launch and any further deployment separately authorized. Preserve the completed migration, smoke and rollback evidence (16.12–16.15).

**Independent of Preview credential rotation:** 14.01, 14.03 and 14.06–14.08 can proceed locally after business/counsel decisions. 09.05 and 11.07 need an approved retention/deletion policy before implementation or testing.

**Remaining-item review (2026-11-26):** Seven business/legal items remain after closure of 16.12, 16.14 and 16.15. Group local verification by dependency: business and legal content (14.01/14.03/14.08), consent behavior if required (14.06–14.08), and inquiry retention/privacy (09.05/11.07). The 14.08 technical results were accepted, but owner/counsel approvals remain open. The provisional Preview maintenance window remains separate.

**Decorative-media implementation verified (2026-11-26):** The homepage retains an illustrative video loop and shared poster fallback; the About image remains responsive. The app serves two WebP files and an optimized MP4 locally. All 148 source tests, targeted ESLint, asset decodes and the optimized build passed. Loopback Chromium confirmed desktop/mobile playback, the poster with video blocked and with reduced motion, local image decoding, HTTP 206 byte ranges and no external page requests. The optimizer rejected the retired Unsplash origin. This does not close 14.08 or change consent policy or inventory media.

**Storage warning investigation (2026-11-26, still open):** Installed Neon CLI 9.10.0 and standalone Firefox 137; existing CLI authentication had access to the authorized Frankfurt project. The [isolated provider trace](./Operations-and-Recovery-Runbook.md#2026-11-26-isolated-provider-trace-evidence) exercised actual signed multipart uploads in Chrome and Firefox. Normal HTTP/2 204 completion, independent byte integrity, replacement/deletion, cancellation, and duplicate completion recovery passed. Provider timings partly correlated; the hosted `net::ERR_ABORTED` warning did not reproduce. Root cause remains open. All 14 targeted source tests passed, with none skipped. No application changes were made. Temporary buckets, credentials, branches and local test artifacts were cleaned up; no Preview or Production resources were changed.

## Protected V1 customer review readiness

This section records the isolated rehearsal and pre-cutover decisions.
See the [delivery milestone](#v1-delivery-milestone) for the completed live
handoff. The seven owner/legal items stay unchecked for public launch.

| Category | Status and remaining action |
| --- | --- |
| Technical blockers for customer review | None confirmed on the protected replacement. Hosted homepage, access gates and ordinary-staff regression passed. The customer invitation still requires separate approval. |
| Business information | Use the supplied business card for the protected review. The owner still verifies the details and supplies registration, VAT, representative, opening hours, service details and additional branding when available. Do not invent or publish those values. |
| Legal approval | 09.05, 11.07, 14.01, 14.03 and 14.06–14.08 remain open. Protected review shows the pending legal notice; comparison, theme and authentication are unchanged. No real inquiries, optional tracking, embedded social/map widgets, or external mail are enabled. |
| Security maintenance | Preserve the coordinated Preview cutover and provisional November 27, 21:00–23:00 CET slot. Verify clone expiry at the scheduled time and complete consumer checks; no exposed credential may be used for review. Keep the existing storage warning and synthetic-account cleanup open. |
| Final public launch | Obtain applicable owner and legal approvals, clean up review accounts and records, and separately authorize 16.12 recovery/migration, 16.14 Production smoke and 16.15 final evidence. No Production operation is authorized by review approval. |

Use the [review deployment sequence](./Operations-and-Recovery-Runbook.md#protected-customer-review-deployment)
and [owner acceptance guide](./Implemented-Sections-Test-Guide.md#protected-v1-customer-review-acceptance).

**Candidate verification:** 151 source tests passed, with none skipped.
TypeScript, changed-file ESLint and Prettier, Prisma schema validation and
client generation, and an isolated optimized Webpack build passed. The build
used a dummy loopback database URL and mocked font responses.

**Authorized rehearsal (2026-11-26):** Pushed `release/v1-customer-review`
at `a7b5d14da70c64eaac74ef3306ccf53a7e3b617e`. Full repository ESLint,
TypeScript and 151 source tests passed. The [isolated rehearsal record](./Operations-and-Recovery-Runbook.md#customer-review-rehearsal-record)
identifies the database, buckets and exact hosted deployment. The additive
migration applied separately after the 12 baseline migrations; schema diff
was clean and all 30 database tests passed on the separate regression
database, including first-run settings, updates, public readback and clearing
an optional field.

The exact SHA is Ready on a protected non-Production Vercel deployment.
Anonymous app, admin, health and robots requests were blocked by Vercel SSO.
Vercel emitted `noindex` on the generated Preview URLs, not on the
authentication redirect for the manual alias. The operator reached the
protected dashboard with the sole isolated review account; the review
database showed one active session and zero dealership records before onboarding.

- [x] **Hosted first-run business-card onboarding:** Saved the approved details
  through both Admin Settings tabs on the isolated review alias. Reloaded
  Settings and verified that dealership and contact values persisted,
  including the third number as a phone. No missing legal facts were added.
  A read-only count confirmed exactly one dealership record in the isolated
  `v1_customer_review` database.

**Hosted acceptance (2026-11-26, exact candidate above):**

| Area | Hosted result |
| --- | --- |
| Business details and legal pages | Contact, shared footer, About and Impressum showed the appropriate saved details. The three `tel:` targets and `mailto:` matched, and the hosted QR matrix matched an independently rendered vCard with the approved contact values. About metadata used the legal name. No missing registry, VAT or opening-hours values were displayed on the checked pages. All four legal pages explicitly marked their texts and disclosures incomplete. The homepage separately contains an unconfirmed claim about documented pre-handover inspections; keep it under 14.01 for owner confirmation or removal. |
| Desktop and mobile-width browser | Homepage, navigation, catalog, comparison, contact, dashboard, inventory and Settings rendered in the same Chromium engine at desktop and mobile widths. Mobile navigation opened and the local homepage video decoded. At 380 CSS px the homepage and Contact fit; at 321 CSS px the homepage reached 365 px because the featured-section “Alle Fahrzeuge” link extended past the right edge. This is a confirmed responsive defect, not a physical-device test. |
| Inventory and media | Tested missing-slug validation, draft creation, edit/readback, admin status filtering, private upload, public-copy approval, replacing the private attachment with its approved public copy, and publication. Catalog search both excluded and found the fixture; comparison retained it on navigation, and the mobile detail loaded the approved image from the dedicated review bucket. Archive removed it from comparison and returned a hard HTTP 404 on detail. The unused private original was deleted via the media UI and its DB row was gone. Permanent vehicle deletion was not exercised; the archived fixture retained its public image. |
| App and hosting access | Anonymous requests were stopped by Vercel Authentication. With hosting access but after app sign-out, `/admin/leads` redirected to app login and `/api/admin/media` returned 401. The operator session was used for the first end-to-end checks; the follow-up below covers ordinary staff. Authenticated app health returned 200, robots was `Disallow: /`, and tested public HTML contained `noindex, nofollow`; canonical URLs retained the configured live-site origin without accessing it. |
| Synthetic inquiries and isolation | The test-only warning rendered. A non-`.invalid` synthetic address got HTTP 400 and persisted no row; the `.invalid` fixture got HTTP 202 and appeared in Leads and the dashboard. The dedicated review DB matched the browser fixtures, and its notification was `disabled`: zero attempts, no send timestamp or provider ID. The safeguard rejects deliverable email domains and warns against real data; it does not detect personal information in other fields. |

**Final-candidate follow-up (2026-11-26):** The featured heading and its
non-shrinking, no-wrap link shared a single forced flex row, wider than the
narrow content container. The row now wraps when needed without changing the
desktop alignment. Chromium on the optimized loopback build passed exact
viewport widths of 320, 321, 360, 375, 390, 430, 768, 1024 and 1440 CSS px.
Document width stayed within the client width, and the link, hero actions
and featured card stayed in bounds. At 321 px, forcing the old no-wrap
behavior increased scroll width from 309 to 365 px. The mobile menu opened,
the desktop featured row stayed inline, and neutral listing copy replaced
the unsupported inspection claim. The 151 source tests, TypeScript, full
ESLint, changed-homepage formatting and isolated optimized Webpack build
passed. The local browser used synthetic fixtures and mocked font loading;
it did not certify the hosted replacement.

**Ordinary staff on the initial hosted revision:** Provisioned one synthetic
`user` via the existing administrator account screen. The user signed in,
opened Dashboard, Leads, Settings, Vehicles and Media, saved unchanged
dealership values, and created and edited a draft with a private upload.
Direct account creation was denied and its form was not shown. Public media
approval, permanent media deletion and direct media download each returned
HTTP 403 with the administrator-only error. After logout, Admin redirected
to login and the media API returned 401. The temporary account and fixtures
remain isolated for tracked cleanup; no temporary password was retained.

**Replacement deployment (2026-11-26):** Verified Git SHA
`152742d366d47b5d3d6dd92e5218947206cea3bb` on
`release/v1-customer-review`, deployed explicitly to Vercel staging as
`dpl_EsqipZ16sP6ZtQx7TykBjNfutMDZ` after authorization, and moved only
the protected review alias after validating the Ready deployment.
The [generated Preview URL](https://kuraishi-v1-customer-review-qyw2iooqr-nikzad-behnams-projects.vercel.app)
and stable origin rejected anonymous requests with Vercel Authentication.
With hosting access, the homepage passed all nine exact widths again:
at 321 CSS px document client and scroll widths were both 309 px, and the
CTA ended at 169 px. The mobile menu opened, the CTA reached the catalog,
and desktop stayed inline. Neutral copy was visible and the old claim was
absent. Health returned 200, robots returned 200 with `Disallow: /`, and
homepage HTML had `noindex, nofollow`. With no app session, Admin landed at
login and the media API returned 401. No schema or environment settings
were changed.

**Ordinary staff on the replacement:** A review administrator created a
fresh synthetic ordinary account through the app. It signed in and opened
Dashboard, Settings, Vehicles, Media and Leads. It read the existing
synthetic lead (notification `Disabled`) and reopened the saved draft and
its 640-by-480 private image. The account creation route returned to
Dashboard without exposing the form. Public-image approval, permanent
deletion and direct download returned the expected administrator-only 403s.
Logout redirected protected Leads to application login and media access
returned 401. The unchanged account, Settings save, draft write and
upload/finalization workflows retain the initial revision's acceptance
evidence; no upload was repeated just to reproduce the warning.

**Handoff recommendation:** The protected V1 is ready for customer review
once the invitation is approved. No invitation has been sent.
Public-copy approval, direct media downloads and permanent media deletion
require an application administrator: use the supervised workflow in the
[owner guide](./Implemented-Sections-Test-Guide.md#protected-v1-customer-review-acceptance),
not elevated owner access by default. Hosted synthetic fixtures remain
isolated; record their cleanup and revoke the temporary operator account
before unrestricted launch. No invitation was sent and no Production
resource was accessed.

The [hosted storage observation](./Operations-and-Recovery-Runbook.md#customer-review-upload-observation)
recurred during a successful ordinary-staff upload: the browser reported
204 and `net::ERR_ABORTED`, while finalization returned 200, exactly one
attachment persisted, and an independent 15,368-byte object readback
matched the synthetic PNG byte-for-byte. The cause remains unresolved.
No storage implementation change or repeat disposable investigation was made.

## Main-domain V1 readiness

**2026-11-26, historical pre-cutover baseline.** The exact V1 candidate passed isolated
review and remains pinned. The main domain is **not ready for cutover**.
`www.kuraishicars.com` and the default Vercel hostname returned anonymous
200; the apex returned 308 to `www`. Production project
`kuraishi-car-dealer` (`prj_nQ4GyGpomFCQPPuEsMtHVUyC0kyD`) is linked to
`master`; the live deployment is `dpl_DcHBBA4ZQLBqo1odQAb2JZaGV9qG`
at `7fdcc66fdfaa09c2c0c21ef60bc7f7ba77ca02db`. Its health route returns
404 and its robots file allows indexing and advertises a legacy sitemap
origin. The Vercel setting is `all_except_custom_domains`; no project
routing rules are active. No cloud configuration or data was changed.

The Production database ledger has exactly one successful row,
`20261113214441_init_better_auth`, with the pinned Git checksum. There are
no failed or rolled-back rows and **all 12 later migrations are pending**.
The catalog contains only the auth tables and Prisma ledger. Its auth
column, constraint and index fingerprint matches all 89 entries in the
fully migrated isolated regression database. All 13 rehearsal migration
checksums match the pinned SQL after accounting for Windows line endings.

Vercel's saved Production `BETTER_AUTH_URL` exactly matches `https://www.kuraishicars.com`.
Production has no `INQUIRY_` entries or cron definitions; the legacy
`RESEND_FROM_EMAIL` entry is unused. Neon confirms a separate storage
branch endpoint and dedicated branch credential with `storage:read` and
`storage:write`; the private and public bucket policies match the intended
configuration. The write-only Vercel entries still need provenance and a
runtime smoke test; the Neon query did not use the app's saved connection.
Production and Preview have distinct endpoints and role update timestamps,
but the same role name. Neither fact proves different passwords. Do not
try the exposed password or export secrets to resolve this.

`d942bf177ea3a2a77f4dd1211a3d0690a9b5c404` passed 17 targeted rollback
tests on its exact archived source. Its schema differs from V1 only by
four extra nullable `Dealer` columns in V1, so it remains the preferred
code-only fallback after migration. Build and verify it against the
migrated schema before relying on it; it does not display all business-card
fields. The live `7fdcc66` revision is not an auth-safe fallback.

| Order | Remaining step and blocker | Autonomous preparation | Separate authorization or input |
| --- | --- | --- | --- |
| 1 | Approved protected cutover executed on 2026-11-26. Anonymous access is no longer available. | Verified the apex, `www`, default Vercel hostname and both deployment URLs were protected before promotion. | Do not remove protection without separate public-launch approval. |
| 2 | Production `DATABASE_URL` updated on 2026-11-26 to the pooled least-privilege runtime identity. Private pooled authentication and post-migration grant checks passed; the new value remains sensitive and Production-only. | Existing live deployment, Better Auth, storage and the legacy saved `DIRECT_URL` are unchanged. The new builds override `DIRECT_URL` at runtime with a non-secret disabled value; the migration credential was not sent to Vercel. | Do not retire the existing credential until its consumers have moved and retirement is approved. |
| 3 | **16.12 complete (2026-11-26):** all 12 pinned migrations applied under the direct migration identity. Prisma confirmed all 13 ledger entries and checksums; no failures or rollbacks. | Verified the fresh Free-plan recovery point, empty Production media buckets, validated constraints and scoped runtime grants. Removed the temporary freeze; homepage, session endpoint and admin returned `200`. | Production restore testing was waived, not verified. Hosted V1 and rollback runtime checks, connector changes and cutover are separate. |
| 4 | Both pinned revisions are Ready and protected: `dpl_GZx9SE3v7Hv5Mb3sk4S91Rut9Vyo` (V1, now serving `www`) and `dpl_2xmgyjyxLkKH6voVwiic9HCaAvGG` (unassigned fallback). | Health returned `200` with `{"status":"ok"}` on both. Both homepages and `/fahrzeuge` returned `200` after the approved first-run insert of one verified business-card record. | The fallback was not promoted or signed into on `www`. |
| 5 | Vercel Authentication (All Deployments) and the two reviewed routing rules were enabled and checked before promoting V1. | Live `www` returned `noindex, nofollow`; sitemap requests with and without a query string returned `404` without XML. Logged-out HTML and API requests were gated. | Preserve these settings throughout customer review. |
| 6 | **16.14 complete:** Production administrator sign-in, dashboard, settings, inventory, media library, inbox, public navigation and health passed. The dealership record persisted; homepage layout had no horizontal overflow in the emulated phone and desktop frames. | An existing ordinary `user` session received `200` with the expected headings on Dashboard, Settings, Vehicles, Media and Leads. Create account was absent in the opened account menu; direct navigation returned to Dashboard without the form. Inquiry intake returned the expected disabled `503`; no inquiries or queued emails existed. | No business data changed. Production had no populated detail or image to check. Direct account-action and media approval/download/deletion denials, populated detail and CRUD rely on separate isolated evidence; they were not repeated against Production. |
| 7 | **16.15 complete:** rollback evidence and approved owner handoff recorded. Code, Postgres and media recovery are independent. | If separately approved, promote only `dpl_2xmgyjyxLkKH6voVwiic9HCaAvGG` and retain All Deployments protection and the two routing rules. No revert or older migrations. Recheck `www` health, auth, intake and indexing. | The rollback remains unassigned; public launch and credential retirement are not approved. |
| 8 | Final handoff approved. The operator confirmed named Vercel access and successful owner sign-in on both the website and dashboard. | The [German/English owner guide](./V1-Customer-Review-Guide.md) and [named-access procedure](./Operations-and-Recovery-Runbook.md#named-owner-access-1615) are recorded. Anonymous `/`, `/admin` and `/api/health` all redirected to Vercel authentication after handoff. | Keep protections in place and the seven business/legal items open. |

The [main-domain runbook](./Operations-and-Recovery-Runbook.md#protected-main-domain-v1-cutover)
contains exact settings, commands, migration and cutover checks. The seven
business/legal items stay open. Preserve the
provisional November 27 Preview credential window independently; the
Preview credential rotation and unresolved Production password non-reuse
remain separate from the completed protected cutover. Keep the storage warning
open without changing upload code, and track synthetic account/fixture
cleanup independently of the release.

**Recovery preparation update:** The original operator evidence supports
independently generated Better Auth secrets and the intended storage
credential mapping. `dev` descended from unprotected `main`, and the
Production role update postdates the fork; this does not prove password
non-reuse. A consumer-by-consumer replacement contingency is documented.
The Free Neon snapshot slot is occupied and was preserved. After explicit
approval, created and verified Ready no-compute preparation branch
`br-snowy-base-b9rdq5rh` from Production LSN `0/1F13410`, expiring
`2026-12-03T13:51:23Z`. No upgrade or paid resource was ordered. There is
no application connection to the copy and no verified restore.
The Free project lacks a verified private source path. Keep the
retained branch no-compute and establish an available, suitable
write-frozen point before migration; do not treat readback as proof
of restoration.

- [x] **Media recovery destination prepared and checked.** Independent
  Frankfurt Free project `morning-fire-32011635`, root
  `br-fancy-unit-bhvjvfzi`: both backup buckets are private and empty;
  anonymous object and list probes returned 403. No SQL compute remains.
  Authenticated recursive counts for the two Production source buckets
  were each 0 objects / 0 bytes. No copy or sample restore took place and
  expected incremental transfer/storage charges for this inventory are
  zero. Recheck the counts at the write freeze; if nonempty, confirm
  access, capacity, retention and cost before transfer.
- [x] **Production role and current grants prepared.** On the verified
  PostgreSQL 18 Production target, created `kuraishi_v1_runtime` and
  `kuraishi_v1_migration` as `NOLOGIN`, with no elevated flags or inherited
  memberships. The runtime can use the schema and has CRUD on the five
  Better Auth tables but no schema creation or migration ledger access.
  The migration role can create schema objects, read/write the required
  ledger fields (no delete), and reference `user.id`. No credentials
  were generated or stored. Enable the two logins only from an approved
  secret store and operator runner; live Vercel updates and retirement
  of the old login still need separate approval.
- [x] **Protected routing draft tested.** Unpublished draft
  `a1e17acb-6fdc-434e-bedb-92e859edc529` redirected anonymous home and
  sitemap requests to Vercel Authentication. In the authenticated
  browser, the draft home returned `200` with `noindex, nofollow`; the
  sitemap returned `404` without XML, including with a query string.
  This draft test used the pre-V1 deployment. After cutover approval,
  the two reviewed rules were published and rechecked on both staged
  revisions and on live `www`.
- [x] **Protected builds and cutover.** Both pinned Production builds
  passed readiness and public-route checks behind Vercel Authentication.
  V1 was promoted to `www` after the approved protection and indexing
  rules passed; the fallback remains unassigned.
  Exact V1 `152742d366d47b5d3d6dd92e5218947206cea3bb` and fallback
  `d942bf177ea3a2a77f4dd1211a3d0690a9b5c404` remain pinned. Reviewed
  `prisma generate` and `next build` hooks on both; the Vercel project
  has no custom install or build commands. Both used non-routable
  build-only database settings and passed runtime readiness against
  the migrated schema with the independent runtime identity.

**Earlier credential and restore investigation:** The
shared host passed an in-memory synthetic RNG and CurrentUser DPAPI
check, but has no approved Production vault or restore boundary. No
PostgreSQL 18 tools, working WSL distro, or Docker/Podman were found;
disk encryption could not be verified. No safe Free-plan restricted
source path for the retained copy was established. The runbook now
includes the private `psql` prompts for activating and verifying only
the new roles, and the exact unassigned Vercel command with non-secret
build-only overrides. Both revisions use the pooled URL from the
server runtime environment; the direct URL is needed only by the
migration operator. The tested draft is unchanged. No live variables,
roles, deployments, or recovery resources were modified in this review.

**Activation and restore update:** Signed EDB 18.7 client utilities
are now available per-user. The private activation console reached
its password prompt following a certificate-verified, password-free
preflight. Activation and login verification are pending operator
entry. No PostgreSQL server or recovery data was installed locally.
The first activation attempt hit the database's idle-in-transaction
timeout while awaiting input. Both roles were rechecked as `NOLOGIN`.
The next attempt reached Neon, which rejected the precomputed SCRAM
verifier from `psql \password`. Both roles still read `NOLOGIN`.
The private launcher now collects the new passwords before connecting
and sends the password statements via stdin over verified TLS after
checking the target and session logging settings. A later attempt enabled
both roles (`LOGIN` confirmed by read-only catalog check), but the pooled runtime
login failed authentication. The launcher stopped before testing the
direct migration login. A verification-only retry on 2026-11-26
passed pooled runtime authentication, direct migration authentication
and current permission checks on Production. This does not verify
post-migration grants or credential confidentiality. No Vercel variables
were changed.
**Free-plan decision (2026-11-26):** Paid infrastructure was declined
and Production restore testing was waived for this V1 release. Neither
the copy nor snapshot was restored. The retained branch was rechecked:
Ready at LSN `0/1F13410`, expiring `2026-12-03T13:51:23Z`. Preserve both
resources, recheck at migration time, refresh if stale within Free quotas,
and recheck media before applying anything. Recovery time is unknown;
the six-hour PITR window can expire, and recovery may lose later writes.
This does not close 16.12 or preapprove restoration.

- [x] **Free-plan synthetic migration permission rehearsal.** On
  loopback PostgreSQL 18.7, starting with the pinned Better Auth
  baseline and matching role grants, the scoped direct role applied
  all 12 pending migrations in order. Prisma reported up to date; the
  ledger had 13 successful entries. Catalog checks verified the four
  nullable dealer columns, three media triggers and no app sequences.
  The runtime role passed scoped table-grant and dealership-lock
  checks; ledger, DDL and disabled inquiry-write access were denied.
  The server was stopped. This is not a Production restore test or
  hosted runtime verification of either pinned release.

## Consolidated V1 verification evidence

These are previously completed checks, not a new suite run or a release
sign-off. Results apply only to the tested revision and environment; the
detailed milestones and [test guide](./Implemented-Sections-Test-Guide.md)
record the setup and coverage limits. Do not combine counts from different runs.

| Area | Evidence already available | Limit |
| --- | --- | --- |
| Staff authentication, first-run settings, and vehicle CRUD (13.07, 16.06) | Isolated browser/DB: pre-hydration credential safety, role checks and sign-in, synthetic dealership creation and versioned updates, draft and media CRUD. | Customer data entry and legal identity are not verified; hosted synthetic account cleanup remains separate. |
| Inventory, media, detail and public freshness (03.14, 06.10, 15.09) | Isolated inventory and vehicle-media suites (30/30 each in 06.10); protected Preview `192b842`: staff access, publish/update visibility, image replacement, canonical and robots metadata, hard 404s and sitemap eligibility. | Preview-only, not Production smoke evidence. |
| Comparison and dealership settings (07.05, 08.09) | Disposable browser/DB: comparison persistence, pruning and retry; staff settings validation, stale-write protection and propagation to public pages. | Settings used synthetic facts; comparison and theme remain unchanged pending legal review. |
| Inquiry, inbox, dashboard and notifications (09.12, 11.08, 12.08, 10.07) | Isolated persistence and browser evidence: validations, access boundaries, authored notes, metric accuracy and retry; mock worker verified outbox integrity, idempotency, retries and failure handling. | No live inquiry or mail acceptance. External email and callbacks are excluded from V1. |
| Legal, consent and local media (14.08 baseline) | Four routes, synthetic shared contact details and six service CTA contexts verified. Local media playback, fallback, reduced motion and absence of external decorative-media requests verified separately at `e44d26a`; 148 source tests and an optimized build passed. | Placeholders and legal classification are still open; see [implementation readiness](./Implemented-Sections-Test-Guide.md#implementation-readiness-after-legal-approval). |
| Release and recovery preparation (16.11, 16.13, 16.15 preflight) | Environment segregation evidence, isolated recovery drill and documented manual path; offline preflight at `53434be` passed 148 source tests plus type/lint/schema/build checks. Archived `d942bf1` passed 147 source tests as a code rollback candidate. | Preflight evidence only. See the [separate Production record](#main-domain-v1-readiness) for completed gates. Production restore testing was waived. |
| Storage warning follow-up | Owner accepted the [isolated provider evidence](./Operations-and-Recovery-Runbook.md#2026-11-26-isolated-provider-trace-evidence). Tested normal upload, integrity, replacement, deletion, retry and concurrency were consistent. | Preserve the implementation. Root cause is unresolved; use the [next-occurrence protocol](./Operations-and-Recovery-Runbook.md#capture-the-next-hosted-preview-occurrence) only during authorized testing. Do not provision another lab without new evidence or a specific hypothesis. |
| Protected customer-review candidate | Initial deployment: isolated migration rehearsal, hosted onboarding, synthetic inquiry, inventory and media smoke, and ordinary staff authorization. Replacement: deployed and verified at all nine viewport widths, with neutral homepage copy, both access gates, indexing controls and ordinary-staff regression. | Historical rehearsal, not the live owner handoff. Track cleanup of both synthetic staff accounts and their test records. |

**Preview maintenance:** The recovery clone lookup is due only after
**November 27, 2026, 20:27:11 CET (19:27:11 UTC)**. It has not been performed
for this update. A confirmed not-found result, the remaining consumer and
test-clone retention checks, and explicit cutover authorization are still
required. The **21:00–23:00 CET** window remains provisional. Synthetic
account cleanup requires separate identification and approval.

This report does not authorize a Production change, data import, migration, email send, or deployment.

## Completed since the initial review

### V1 scope decisions closed on 2026-11-26 (not implemented)

- [x] **05.07 — Extra catalog filters and sorts:** Excluded from v1; potential v2 enhancement. Existing catalog behavior is preserved.
- [x] **10.01 — External staff email:** Excluded from v1; delivery stays disabled. Staff use the protected inquiry inbox. This does not certify live provider readiness.
- [x] **10.03 — Visitor acknowledgement email:** Deferred to v2. Existing on-screen feedback is preserved.
- [x] **10.06 — External provider callbacks:** Excluded from v1. No callback endpoint was added, and internal notification safeguards are unchanged.

### Implemented and verified milestones

- [x] **10.07 — Notification verification.** A loopback worker with a disposable database and a mocked provider verified one outbox row per inquiry, concurrent replay/worker claims, and rollback of inquiry intake when the outbox insert failed. A timeout queued a retry; the retry reused its idempotency key and stored mock acceptance. Permanent rejection and a throttled fifth attempt remained terminal. Checked simulator-only addressing, escaped markup, protected links, aggregate-only responses, and exclusion of contact data and message text from provider payloads. The browser showed Queued, Retry pending, Provider accepted (not mailbox delivery), and a sanitized failure; anonymous detail access and a worker request with only a staff session were denied.
  - Fixed the worker rejecting bodyless HTTP POSTs that Next.js exposed as empty streams. The handler now checks for actual bytes after authentication; a regression test failed before and passed after the fix. All 148 source tests, TypeScript, targeted ESLint and formatting checks passed. The local process, disposable database and mock fixtures were removed. No external email request, hosted Preview change, or Production access occurred. Live provider acceptance and callback testing are outside v1.

- [x] **12.08 — Dashboard regression.** Isolated ordinary staff saw the loading skeleton, four zero KPIs, five zero percentages, and the empty inquiry message. Draft creation and archiving used the actual app routes; Published and Sold browser states used database fixtures because object storage was not connected. The isolated inventory suite exercised the real publish and sell handlers with simulated media reads. The browser verified 50/50 Draft/Archived percentages, a sale still counted after archive, and separate general/vehicle inquiry changes. The final totals (2 inventory, 6 leads, 1 sold, 1 vehicle inquiry) matched a direct database read. The recent list excluded the older sixth inquiry while keeping historical vehicle context, and its row link opened the correct protected inquiry. The inventory link opened both expected records. Anonymous access was redirected; unsupported views were absent.
  - An induced database query failure showed an error without stale or zero metrics. The original boundary's reset replayed the failed result without a fresh server request. Changed only the admin retry action to reload the current URL; the browser confirmed a new request and restored metrics after the fault was cleared.
  - All 147 source tests, 30 isolated inventory tests, TypeScript, and targeted ESLint passed. Both disposable databases were removed, the loopback server was stopped, and no mail provider, hosted media storage, or Production resources were contacted. The storage warning, coordinated Preview credential rotation, and hosted synthetic-account cleanup remain open in the [runbook](./Operations-and-Recovery-Runbook.md).

- [x] **11.08 — Inquiry-to-inbox regression.** Two synthetic browser submissions (general and vehicle-linked) returned only `202 {"ok":true}`. Ordinary staff verified newest-first ordering, search, contact links, vehicle context, and an authored, trimmed note that survived refresh. Anonymous access to the inbox and to a known inquiry was denied, as was an anonymous note submission. An unknown ID showed not-found, a general lead had no vehicle or call link, and removing the synthetic live relation preserved the historical vehicle reference.
  - Missing consent showed browser validation and returned HTTP 400 at the API. A disposable-database fault caused the public endpoint to return a sanitized HTTP 503; a separate note-write fault showed refresh-before-retry guidance. Database checks confirmed exactly two accepted inquiries with consent evidence, two disabled notification rows with zero attempts, and one saved note. No application changes, provider calls, hosted testing, or Production access were needed.
  - All 147 source tests, TypeScript, and all 30 isolated inventory tests (6 migration, 24 query) passed. The first DB run stopped in setup because a blank database lacked the Better Auth baseline. Applying only that baseline and using a valid Node loader file URL allowed the unchanged suite to pass. The loopback server was stopped and both disposable databases were removed.

- [x] **08.09 — Settings regression.** Ordinary staff signed in and saved synthetic identity and contact changes, saw pending and success feedback, and verified persistence after refresh. A stale form could not overwrite the newer record. Invalid email, an HTTP business URL, a non-Google Maps URL, and an overlong short name were rejected without persisting. A cookie-free save request was denied. An induced database failure returned error feedback without success; a direct read after recovery confirmed the stored values and version were unchanged.
  - Anonymous reads of the homepage, contact page, vehicle detail, about page, and imprint showed updated dealership values. The contact page retained additional phone and social links and showed the updated map link; admin used the updated short name. The vehicle canonical and sitemap were unchanged, and Better Auth rejected the saved business URL as an origin with `403 INVALID_ORIGIN`.
  - All 147 source tests and the focused isolated first-run settings database regression passed. TypeScript and Prisma schema validation passed at the unchanged application revision; the unchanged inventory suite passed 30/30 in 06.10. The isolated browser server was stopped and its disposable database removed. No application changes, hosted writes, or Production access were needed.

- [x] **07.05 — Comparison regression.** An anonymous browser on the optimized loopback build retained three selected synthetic vehicles across refresh and detail/catalog navigation, rejected a fourth with a clear message, and supported individual removal and clear-all. It repaired malformed and legacy storage, removed duplicates and invalid IDs, pruned a nonexistent ID and a selected vehicle archived after selection, and retained the eligible order. Reserved showed as Reserved; a changed price, missing mileage, and image placeholders rendered as expected. A real missing-table query error in the disposable database showed an error and retry without clearing saved IDs; restoring the table and clicking retry recovered the comparison. The disposable database was removed. All 147 source tests passed, including four focused storage tests. The unchanged inventory suite passed 30/30 in 06.10. No app changes, Production access, or hosted changes were needed.

- [x] **06.10 — Public detail regression.** Protected Preview `192b842` showed saved dealer and owner values, approved images in order (private image excluded), gallery images with saved alt text, current price and cover metadata after edits, and matching desktop/mobile phone and vehicle-aware contact actions. Reserved retained comparison without the immediate-availability claim; Sold retained detail with general contact and no comparison. The related section showed an eligible same-body vehicle and disappeared when it became Reserved. Both synthetic listings were archived and returned hard 404s with `noindex` and no stale Open Graph image. The same Preview revision's 15.09 evidence covers draft rename, published slug immutability, canonical metadata, and draft/deleted/unknown 404s.
  - **Disposable browser and DB:** The optimized local build rendered an accessible image placeholder, unavailable optional values, and working contact links for the published legacy fixture. A failed-inspection draft returned a hard, non-indexable 404. The unchanged schema rejected Published and Reserved with failed inspection; the unchanged inventory policy matrix verified the hypothetical combinations without weakening the constraint. Recommendation bounds, ordering and other exclusions were covered by the inventory suite.
  - **Automated:** 147/147 source tests, 30/30 isolated inventory migration/query tests, and 30/30 isolated vehicle-media tests passed. An initial runner timed out; its test database was no longer empty at the next preflight and was left untouched. Both suites passed unchanged on a fresh isolated database. The two disposable databases created for 06.10 were removed. No application or schema changes were needed.
  - **Follow-ups:** Two more isolated Preview uploads returned HTTP 204 and finalized while Chromium reported `net::ERR_ABORTED`. Root cause remains open. Preview database credential rotation and synthetic-account cleanup are pending as documented in the [runbook](./Operations-and-Recovery-Runbook.md#outstanding-security-maintenance). No Production resources were accessed.

- [x] **15.09 — Public freshness/SEO regression.** Passed on protected Vercel Preview `192b842` (`dpl_Cp5YBb9rnypuU95dSF9Lga76KKb1`). All 147 source tests, TypeScript, targeted lint, and the isolated optimized build also passed. No structured-data requirement was found in the tracked specifications.
  - **Protection and isolation:** Both hosted names redirected anonymous home, robots, and health requests to Vercel Authentication. Behind that protection, health returned 200/`ok` on both. Synthetic staff signed in on the branch alias; a Vercel-authenticated browser without an app session got 401 from the staff media API. A read-only query on the exact Frankfurt `dev` database matched the vehicle written by Preview. Both synthetic uploads targeted the approved Preview private bucket; their approved images used the Preview public bucket. The operator confirmed independent Preview auth credentials and absent inquiry mode flags, which disable test mode and email delivery. No inquiry or email was sent. The worker GET returned 405 and the browser's POST returned 400 before the configuration guard, so neither response was used as evidence of delivery mode.
  - **Freshness:** Renamed and published a draft; the catalog, detail, and sitemap picked it up, while the old slug stayed hidden. A published slug change was rejected. Updates to price, description, and the approved cover image appeared in catalog/detail and Open Graph metadata; the replacement decoded in the browser and the original disappeared. Sitemap `lastmod` advanced after the update and stayed stable on repeated reads. A Settings change propagated to public pages and the tagline was restored. The synthetic Preview fixture's invalid map URL was replaced with a valid test map URL; its business website URL was not changed.
  - **SEO and removal:** Checked localized canonical, title, description, Open Graph, `noindex`, and `robots.txt` (`Disallow: /`, no sitemap directive). The sitemap excluded private paths and hidden vehicles. Sold detail stayed at 200 and in the sitemap, but disappeared from the catalog. Archived, deleted, and unknown vehicle URLs returned HTTP 404 with the localized fallback and no stale listing description or image. The fix scopes loading boundaries so Next.js decides visibility before committing a status.
  - **Separate unresolved issue:** Both test storage POSTs returned 204 and finalized successfully, but the browser again reported `net::ERR_ABORTED`. This does not establish a cause or make the warning harmless. See the [runbook](./Operations-and-Recovery-Runbook.md#media-uploads-and-orphan-cleanup). No Production resources were accessed.

- [x] **13.07 — Workspace and sign-in verification (2026-11-24).** The login and staff provisioning forms relied on hydrated React handlers and omitted the native form method. On a cold page, the browser could submit the named fields using GET before Better Auth received a request. Both forms now use POST and disable all controls until hydration; without JavaScript they stay disabled and explain why. Better Auth, its rate limit and sessions, and the server-side administrator check remain in place. Next development logging no longer prints server function arguments or URLs for credential routes. Unexpected auth errors use sanitized messages; app-side logs and request URLs captured during the retest contained no synthetic credential values.
  - **Verification:** Delayed scripts left the native login submit inactive and native form data empty. With scripts disabled, both credential forms remained inactive. Hydrated sign-in posted credentials in the request body, handled invalid credentials and network failure safely, returned to the protected destination, and persisted across reload. Inventory-only search returned the expected synthetic listing; account creation was denied to ordinary staff, allowed for administrators, and assigned the ordinary staff role. Signed-out requests returned to login without rendering search results. The direct server-action tests cover anonymous and ordinary staff denial. All 145 source tests, TypeScript, repository ESLint, changed-code formatting, and an optimized local build with isolated configuration passed. Test accounts were disabled after use; no Production resources were accessed.
  - **Separate storage follow-up remains open:** A Chromium network trace correlated the same isolated upload request's HTTP 204 with a subsequent `net::ERR_ABORTED` event; the browser fetch returned 204 and the object finalized. This narrows the warning to a post-response event in the observed trace, not its root cause. See the [runbook](./Operations-and-Recovery-Runbook.md#media-uploads-and-orphan-cleanup).

- [x] **03.14 — Public-image replacement regression (2026-11-24).** On an isolated local app, a synthetic administrator uploaded and approved two distinct images and published a synthetic listing with the first. The original rendered on the German catalog and detail pages. A versioned update through the authenticated inventory API replaced the attachment. The same browser URLs showed the decoded replacement and no stale original; the detail page's `og:image` matched the replacement. Fresh anonymous canonical requests confirmed the new image, without a redeploy. Prior isolated suites cover the other applicable cases. No application changes or Production access.
  - **Upload trace follow-up:** Chromium again recorded `net::ERR_ABORTED` for the private storage POSTs while the browser fetches reported success and both assets finalized, were approved, and rendered. Keep this as an open diagnostic observation, not an upload failure; see the [media runbook](./Operations-and-Recovery-Runbook.md#media-uploads-and-orphan-cleanup).

- [x] **16.06 — Synthetic CRUD verification and customer handoff (2026-11-24).** The customer enters real dealership, inventory, and media data after handoff. No real data was imported or published. Registered legal identity remains under 14.01.
  - **First-run implementation:** Admin Settings opens a blank form with no dealership, creates the first record on authenticated save, rejects a competing first save as a conflict, and preserves version-checked updates. No schema or dependency changes were needed.
  - **Browser and database:** Normal Better Auth sign-in as synthetic staff, first Settings save without a seeded dealership, persisted readback, and a subsequent update all passed. A synthetic vehicle was created, reopened, edited, and archived; a separate never-published draft was permanently deleted. Reload and read-only database checks confirmed archive and deletion. Private images rendered after upload and replacement. Removing the replacement left no attachments, and both detached asset rows remained. The ordinary staff account was correctly denied access to the administrator-only Media Library. The browser reported an aborted storage POST, but finalization and persisted image retrieval succeeded.
  - **Suite diagnosis and results:** Inventory queries refused a target with nine existing vehicle rows. A completely empty database also failed setup because the migration hook fingerprints Better Auth tables before applying release migrations. A fresh database with just the auth baseline and no fixtures passed the full inventory run **30/30** (6 migration, 24 query). Media migration passed **11/11** unchanged with more time for its two Prisma deploys and schema diff. Vehicle-media originally passed 6 and failed 24 because its fixture created a second dealership on a shared target; it passed **30/30** on a clean target. No tests were skipped or weakened.
  - **Other checks:** 143 source tests, the focused fresh-database regression (authorization, validation, concurrent creation, readback and update), 22 additional media/storage tests, TypeScript, ESLint, and changed-code formatting passed. No Production database or storage was accessed. The [runbook](./Operations-and-Recovery-Runbook.md#first-run-dealership-setup-1606) documents customer setup and isolated retest prerequisites.

- [x] **09.12 — Inquiry intake verification:** completed on 2026-11-20 after the isolated migration/query suite passed 30/30. It verifies durable intake, inquiry categories, quota/window reset, stale/forged vehicle context, invalid consent/date, duplicate/concurrent retries, database failures, inbox readback, and notes. The isolated 11.08 browser retest passed; the authorized release smoke test is separate under 16.14.
- [x] **16.11 — Environment separation:** pre-release configuration review completed on 2026-11-24 for Production and the release branch's Preview. Evidence came from dashboard scopes, operator setup records, and Preview browser checks; no secret values were recorded.
  - **Database and auth:** Production uses pooled and direct URLs for the same database on Frankfurt `main`; the release branch's Preview uses `dev`. The operator confirmed the intended HTTPS auth origins and independently generated auth secrets. Other Preview branches were not verified.
  - **Storage:** The operator confirmed that all six Production-only Vercel values match the dedicated Frankfurt storage project, its private and public-read buckets, and its own credential. Preview and the isolated media suite use separate targets, buckets, and credentials. Preview private upload, thumbnails, download, and deletion passed. The unused bucket pair on the original `main` was not wired into the app.
  - **Notifications:** Both inquiry mode flags are unset in Production and Preview. `RESEND_FROM_EMAIL` is unused; the app defaults to disabled delivery. Vercel and Resend showed no project/app webhooks, the operator confirmed no external schedules or other callbacks, and Vercel support reported zero cron definitions for the current Production deployment.
  - **Historical runtime handoff:** The then-live deployment (`7fdcc66`, created 2026-11-16) predated the saved storage variables. This preflight did not exercise them. The later [16.14 Production health check](#main-domain-v1-readiness) verified access to both configured buckets on the deployed V1.
- [x] **16.13 — Deployment path:** approved on 2026-11-20 and recorded in the [operations runbook](./Operations-and-Recovery-Runbook.md#manual-production-deployment-1613). Verified the documented `vercel deploy --prod` command against the Vercel CLI reference and confirmed Git deployments remain disabled. No Production deployment was run.
