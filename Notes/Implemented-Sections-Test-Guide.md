# Full test guide for implemented checklist sections

This guide covers the integrated work currently on `backend/seo-and-cache-consistency`, based on `feature/public-content-and-consent`, `feature/admin-workspace-search`, and `backend/dashboard-metrics`, including Sections 04-15.04:

- Section 01: approved business rules and pure policy/auth contracts.
- Section 02: inventory schema, migration, queries, search, DTOs and controlled fixture-import logic.
- Section 03.01-03.13: media storage, upload, approval, relationships, library, downloads and deletion.
- Section 04.01-04.17: staff inventory, vehicle mutations, lifecycle, authorization, public detail and live dashboard counts.
- Section 05.01-05.06 and 05.08-05.09: live homepage/catalog inventory, bounded search, URL navigation, pagination and public eligibility.
- Section 06.01-06.09: live public detail lookup, approved gallery media, dealership contact, similar inventory and record-derived metadata.
- Section 07.01-07.04: anonymous live comparison selection and rendering against current eligible inventory.
- Section 08.01-08.08: persisted dealership settings, validated admin editing, shared public business data and the approved initial-data migration.
- Section 09.01-09.04 and 09.06-09.11: inquiry persistence, shared validation, guarded isolated-test intake, retries and vehicle/service context; Production remains disabled.
- Section 10.01 (partial): Resend staff-only provider selection, disabled/default and isolated simulator-only configuration.
- Section 10.02: privacy-minimal HTML/plain-text staff alert content with escaped snapshots and a protected inbox link.
- Section 10.04-10.05: durable outbox, bounded retries, Resend simulator adapter and test-only worker endpoint; no automatic schedule or Production delivery.
- Section 11.01-11.04: protected database-backed inquiry inbox, server-side search and pagination, selected detail, historical vehicle context, contact links, and per-inquiry notification status/failure display.
- Section 11.05-11.06: append-only authored inquiry notes; database and browser verification remain deferred.
- Section 12.01-12.07: database-backed dashboard aggregates and latest-five inquiries; unsupported view counters are hidden by decision. Section 12.08 database/browser verification remains pending.
- Section 13.01-13.03: inventory-only top-bar search routed through the existing bounded, authenticated inventory query; lead/media global-result routing is not applicable.
- Section 13.04: live staff identity in the sidebar and truthful staff sign-in copy; top-bar sign-out behavior is unchanged.
- Section 13.05: Create account is restricted to master admins, while ordinary staff operations remain available to authenticated staff.
- Section 13.06: backend/auth documentation was corrected; direct access and browser checks in 13.07 remain deferred.
- Section 14.01-14.05 (in progress): unverified homepage/About claims were removed; static content and the current database-managed business settings are used; the user confirmed the service list. Service CTAs submit inquiries without confirming appointments. Legal copy and consent/media decisions remain deferred to counsel; combined browser retesting is also pending.
- Section 15.01-15.08: the user confirmed `.com` as canonical; metadata/auth use the shared origin; public detail metadata uses eligible live records and approved media; localized URL mapping preserves dotted vehicle slugs and query context; the sitemap uses paged eligible records and persisted timestamps. Published slugs remain immutable; only never-published vehicles may change slugs; sold details stay available while archived/draft/deleted vehicles return not found. Inventory writes invalidate dependent routes, all `/admin` and `/api` responses are private/no-store, and crawler exclusions do not replace authorization. Section 15.09's end-to-end public refresh verification remains pending, as do isolated database/browser checks. The separate database-managed dealership website URL was not changed.

Section 04 is complete but was not merged to `master` before Section 05 began; the user deferred the combined manual retest until later. Sections 06.10, 07.05, 08.09, and 12.08 still need the isolated inventory-query suite after the test credential is rotated; the manual page checks below are also pending. Section 08.08 uses the user-approved legacy Dealer fixture as its one-time contact-data baseline. Section 03.14 is still incomplete pending the public-image-refresh check in Section 15.09. Section 05.07's optional filter/sort controls were not approved and are not implemented.

## 1. Safety and prerequisites

1. Use `feature/admin-workspace-search`, not `master`, for the current Section 13.01 implementation:

   ```powershell
   git branch --show-current
   git status --short --branch
   ```

   The branch should be `feature/admin-workspace-search`. It includes the integrated Sections 04-12 work plus the inventory-only top-bar search. Preserve unrelated local work; do not switch branches over uncommitted changes.

2. Use Node 25.8.0, or a Node version that supports the test-runner flags in the package scripts. The machine PATH previously selected Node 14, which cannot run these scripts; Node 22.21.1 also lacked `--test-isolation=none`.

3. Use the repository's existing pnpm setup. Keep test database and object-storage configuration private. Do not print, paste, commit, or include environment-file contents in screenshots or reports.

4. **Never run these tests against Production or the normal application database.** The media database suites use `.env.media-test.local` and its isolated test resources. The inventory database suite uses `.env.inventory-test.local`, applies migrations, and requires a separately verified isolated, empty test database.

5. **The `.env.inventory-test.local` credential was previously exposed and must be rotated before that file is used again.** Until it is rotated and the isolated target is confirmed, skip `pnpm test:inventory-db`. Do not reset a branch or remove unfamiliar data to make a test pass.

6. Run database suites one at a time. Several use the same isolated media database and storage bucket.

## 2. Automated full-branch regression

Run these checks individually from the repository root. Stop and investigate if any command fails:

```powershell
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
```

`pnpm test` runs the source-level unit tests, including the Section 01 lifecycle, eligibility, validation and authorization policy tests. These are policy tests; they are not a substitute for the database or UI tests below.

Run the Section 03/04 isolated database and storage suites sequentially:

```powershell
pnpm test:media-db
pnpm test:media-approvals
pnpm test:media-upload
pnpm test:media-library
pnpm test:media-downloads
pnpm test:media-deletions
pnpm test:vehicle-media
pnpm test:media-storage
```

After the inventory-test credential has been rotated and the target independently confirmed as isolated and empty, run the Section 02 migration/query suite:

```powershell
pnpm test:inventory-db
```

That command deploys migrations to its configured test target. If the target is unknown, contains unexplained inventory, or the credential has not been rotated, do not run it.

Optional build check: run `pnpm build` only when the build environment is configured with safe non-Production settings. Review any generated `next-env.d.ts` change afterward and preserve unrelated edits.

## 3. Section 01 — business rules and policy contracts

1. Review the approved decisions in [Checklist.md](./Checklist.md), especially lifecycle transitions, public eligibility, inspection, Featured/availability, single-dealership scope, money, dates and deletion rules.
2. Run the Section 01 cases through `pnpm test`.
3. Confirm the tests cover:
   - All five lifecycle statuses and permitted/forbidden transitions.
   - Published-only availability; passed-inspection requirements; Featured clearing when leaving Published.
   - Public versus private projections and the visibility matrix.
   - Anonymous access denial, ordinary-user dashboard access, and master-admin-only account creation.
   - Strict validation and bounded pagination behavior.
4. Treat Section 01 as a decision/policy foundation, not a live database or public-page test. Live inventory behavior is tested in Sections 02-04 below.

## 4. Section 02 — inventory schema, migration and queries

### Automated database checks

1. First satisfy the credential/target gate in Section 1 above.
2. Run `pnpm test:inventory-db`.
3. Confirm the suite succeeds without skipped tests and verifies:
   - Migration deploy/redeploy and schema-drift checks.
   - Existing auth tables/columns remain intact.
   - Exact money and nullable technical/date fields persist correctly.
   - Unique stock numbers/slugs, lifecycle constraints and indexes.
   - Staff/public queries, bounded pagination, deterministic ordering and counts.
   - Search terms and category labels, public eligibility, and private-field exclusion.
   - DTO serialization, missing/invalid input and database-error propagation.
   - Fixture-import preview/apply behavior, conflict refusal, edit preservation and rollback; the test suite cleans up its own rows.
4. Do not run `pnpm inventory:fixtures --apply` as part of this guide. A persistent seed requires separate approval and a separately verified target. Never seed Production with demo vehicles.

### Expected limitation

Section 02 provides durable schema and query contracts. The UI flow that writes inventory is Section 04; the public homepage/list database integration is Section 05. Passing Section 02 tests alone does not establish either UI integration.

## 5. Section 03 — media uploads and library (03.01-03.13)

Run the media suites from Section 2 before the manual checks. For manual checks, first confirm the running app uses an isolated non-Production Neon database and the isolated test bucket. Use synthetic files only; do not upload customer or dealership documents.

1. **Upload and validation**
   - Sign in as an authorized staff test account.
   - Upload a small valid JPEG or PNG and verify it becomes a private media asset. Images are limited to 10 MiB each; a request accepts at most 5 files.
   - Try an unsupported type, invalid file signature, an image over 10 MiB, and more than 5 files in one request. Each should fail with an actionable error and must not become a usable asset.
   - Upload a test PDF up to 20 MiB and confirm it is stored as a private document; a PDF over 20 MiB must be rejected.
2. **Interrupted/retried uploads**
   - Exercise the cancellation/retry flow if available in the local UI.
   - Confirm a canceled or incomplete upload is not listed as a completed asset.
   - Confirm retry/completion is idempotent and cleanup does not delete a completed asset.
3. **Approval and privacy**
   - As ordinary staff, verify public approval is unavailable or denied.
   - As the master admin, create/approve the separate public image copy.
   - Confirm the private original remains private and only the explicitly approved copy has a public URL.
4. **Vehicle relationships**
   - Add approved and private test images to a Draft vehicle; save, reload, reorder, and remove one.
   - Confirm order persists, the first image is the cover, and removing an image detaches it rather than deleting the asset.
   - Confirm an asset cannot be attached to a second vehicle and the 20-image cap is enforced.
   - Confirm a vehicle cannot be published with only private or unapproved images.
5. **Library actions**
   - Search by title/filename/alt text and related vehicle; combine type and usage filters; navigate another page.
   - Confirm usage, upload date, size and dimensions reflect stored data.
   - Copy a public URL and download one file; download a bounded selection as a ZIP.
   - Delete an unused asset, then try an attached asset. The attached asset must be blocked until detached/replaced. Check per-item results for mixed bulk outcomes.
6. **Public rendering**
   - After a vehicle is Published, open its canonical detail URL and check that only approved public images render.
   - Do not mark 03.14 complete yet: public-image replacement/freshness still requires the Section 15.09 verification described in the checklist.

## 6. Section 04 — admin vehicle workflows (04.01-04.17)

Use only a safe non-Production app environment and existing test accounts. The database suites cover the underlying writes; this section is the UI-level regression.

1. **Authorization**
   - Signed out: visit `/admin`, `/admin/vehicles`, and an edit URL. Expect login/401 behavior and no protected data.
   - Ordinary staff: verify inventory management works, but account creation remains unavailable.
   - Master admin: verify the approved account-creation area is available.
   - Never use real user credentials in a report or screenshot.
2. **Inventory list**
   - Check the 8-row default page, updated-descending ordering, stable page navigation and current result counts.
   - Search by stock number, make, model, variant and location; combine with status filters.
   - Sort by title, price, mileage, status, location and last update in both directions. Check nullable values and invalid/stale page URLs.
   - Select rows, navigate pages, and change filters. Selection must follow the approved rules and stay within the selection limit.
3. **Create and edit**
   - Create a Draft with required identity and optional fields left blank. Save, refresh and reopen it; blanks must remain null/blank rather than becoming fake zeros or fixture values.
   - Edit descriptive, technical, pricing and ordered-media fields. Save and reload to confirm persistence.
   - Open the same record in two tabs, save one tab, then submit the stale version from the other. Expect a conflict, no overwrite, and no success toast.
   - Try duplicate stock/slug values and invalid values. Expect explicit errors and no partial write.
4. **Preview and publish**
   - Preview a Draft through the staff-only preview path. In a signed-out browser, its slug must not expose the Draft or private media.
   - Try publishing with missing required fields, a short description, invalid price/registration, no approved public image, or without inspection confirmation. Each must fail without a success toast.
   - Publish a complete Draft with an approved public image and explicit inspection confirmation. Reload the inventory and open its canonical public detail URL; verify current database fields and approved image.
   - Confirm a published slug cannot be changed through edit.
5. **Lifecycle and deletion**
   - Reserve a Published vehicle: dashboard/list counts should move Published -> Reserved; public detail remains but must not claim availability. No automatic expiry is set.
   - Release the reservation: counts return to Published and availability returns. Featured placement is not restored automatically.
   - Mark it Sold: sale timestamp is recorded, availability is false, and the Sold detail remains accessible.
   - Archive it: it disappears from eligible public detail and remains as an archived staff record.
   - Duplicate a vehicle: verify a fresh Draft with a new stock number/slug, cleared lifecycle data, and no copied images.
   - Permanently delete only a never-published Draft after confirmation. Its history is removed, but media assets remain. Published/previously published records must not be hard-deleted.
6. **Bulk outcomes**
   - Run bulk Sold and Archive on valid and invalid/mixed selections.
   - Verify successful/already-completed IDs are reported separately from failures, failed records remain selected, and counts refresh only when at least one item succeeds.
   - Retry a successful action and confirm it is unchanged/idempotent. Verify failed writes show errors/results, never a success toast.
7. **Public detail and dashboard propagation**
   - After each create/edit/publish/lifecycle/duplicate/delete and bulk action, revisit the admin dashboard and verify total and status counts.
   - Public detail should reflect Published, Reserved and Sold records immediately when loaded; Draft and Archived records should be hidden. A failed stale write must leave persisted state/counts unchanged and show error feedback only.
   - Verify homepage/catalog propagation in Section 05 below. Dashboard metrics are database-backed per Section 12, and comparison IDs resolve against live eligible inventory per Section 07.

## 7. Section 05 — live homepage and public catalog (05.01-05.06, 05.08-05.09)

Use the isolated non-Production app/database and test media bucket. Create or edit vehicles only through the admin flow. The public homepage and catalog are dynamic; they must never fall back to demo vehicles when a query fails.

1. **Homepage featured vehicles**
   - Publish and inspect a vehicle, mark it Featured, and confirm it appears on the homepage with its first approved public image as the cover.
   - Confirm ordering is deterministic (most recently updated first, then stable ID order), and only eligible, inspection-passed Featured inventory is shown.
   - Unfeature/archive a test vehicle and refresh the homepage; it must disappear without a redeploy.
   - With fewer than 8 qualifying Featured vehicles, confirm the page shows only those vehicles. With none, confirm the honest empty message and the all-vehicles link, not fixture/demo cards.
   - Attach a private or unapproved image and confirm it is not shown publicly. Reorder approved images and confirm the first ordered image is used.
2. **Live catalog and card data**
   - Confirm the catalog shows database vehicles, including Published and Reserved eligible stock. Draft, Archived, and inspection-ineligible records must not appear; Sold records follow the approved policy and are not catalog results.
   - Check card price, registration, mileage, fuel, transmission, power, labels, comparison control and canonical detail link. Missing optional data should display as missing, not invented zeros or fixture values.
   - Confirm Reserved is labeled unavailable/reserved rather than immediately available. Check the first approved ordered image and the no-image placeholder.
3. **Result counts, loading, empty and query errors**
   - Verify result counts match the total matching database records, not just the current page.
   - With an empty catalog, check the separate empty-catalog message. Search for a nonmatching term and check the no-results state plus clear-search action.
   - Check the loading skeleton while requests are pending. Simulate an unavailable database/storage dependency only in a safe test environment; expect the explicit retry/error boundary and no fixture fallback.
4. **Shareable search URL and database search**
   - Type a search and confirm the debounced server search updates `q` in the URL. Open that URL in a new tab; the same results and input value should appear.
   - Use browser Back/Forward after navigating away and across page links; the input and results must follow the URL. Clear the query and confirm `q` and `page` are removed and the unfiltered catalog returns.
   - Test multi-term make/model/variant, German body/fuel/transmission labels, color, location, registration, equipment and labels; verify each term must match. Include uppercase/accented terms and a term with no match.
   - The query is bounded to 100 characters. Try a longer value, repeated `q` parameters and malformed page values such as `page=0`; expect the invalid-query state and a working reset link.
5. **Bounded pagination**
   - Confirm 12 results per page and accurate page/total indicators.
   - Navigate forward/back; links must retain `q`, and a fresh search must return to page 1.
   - Open a page link directly and verify the same results. Try a valid but beyond-last page and use the provided link back to page 1.
   - No public filter or user-selected sort controls should appear; those remain the unapproved optional 05.07 scope.
6. **Cross-section propagation**
   - Publish, feature, reserve/release, sell and archive test vehicles through the admin workflow. Reload homepage and catalog after each change.
   - Verify eligible published/featured stock appears, Reserved listing cards show their status, Sold/Archived/Draft stock is excluded from discovery, and no redeploy is needed.
   - Verify the live comparison table as described in Section 9 below.

## 8. Section 06 — public vehicle detail (06.01-06.10)

Use the isolated non-Production app, inventory and media resources. Create and change vehicles only through the admin workflow; do not edit production records to exercise a page.

1. **Database-backed detail and truthful stored data**
   - Open a published, inspection-passed vehicle and compare its detail page with the saved admin record: make/model/variant, price, location, registration, mileage, fuel, transmission, power, body type, color, condition, owners, consumption, CO₂, features, labels and description.
   - Check missing optional values: they must remain blank/unavailable, not show fixture values, invented owners, or zeroes. Confirm no hard-coded preparation or 120-point inspection claims appear.
   - Open a Reserved vehicle that passed inspection. It should show Reserved, not immediately available, while retaining the comparison action allowed by the shared policy. Open a Sold vehicle; it may have a detail page, but must show Sold and unavailable, omit comparison actions and use a general contact action.
   - Try guessed URLs for Draft, Archived, and inspection-ineligible Published/Reserved vehicles. They should return the same not-found view; page metadata should be noindex.
2. **Approved gallery media and accessible text**
   - Attach multiple images in a known order, including a private or unapproved image. Confirm only approved public images appear, in attachment order, and the first is used for social preview metadata.
   - Open each gallery image in the preview slider; verify saved alt text is used and the fallback describes the vehicle view without claiming an unsupported angle.
   - Test an eligible legacy record with no approved images. The detail page should show the placeholder and remain usable.
3. **Dealership and contact consistency**
   - Confirm the displayed dealership name matches the vehicle's Dealer record. Compare the phone and address with the shared public contact information.
   - Test desktop and mobile call links; both should use the configured primary phone. Confirm there are no fixture star ratings or review counts.
   - Published and Reserved contact links should carry the current URL-encoded vehicle slug. Sold links should be general and omit the vehicle query. Section 09 now resolves this context server-side and revalidates it at acceptance.
4. **Similar inventory**
   - Publish another eligible vehicle with the same body type. Confirm it appears, while the current vehicle and vehicles of other body types do not.
   - Confirm Draft, Archived, Reserved and Sold candidates are excluded, result count never exceeds three, and ordering is stable.
   - With no eligible same-body candidates, confirm the entire similar-vehicle section is hidden rather than showing fixture cards or an empty heading.
5. **Metadata, slugs and refresh**
   - Check the record-derived title/description, canonical path and OpenGraph URL. When approved media exists, the first ordered approved image should be the OpenGraph image.
   - Change a Draft slug before publishing; the new path should work and the old path should not resolve to that vehicle. Confirm an already published slug cannot be changed through the admin form.
   - Edit a vehicle's price, description, images and status through admin, then reload its detail page. Confirm current values appear without a redeploy or stale fixture data.
6. **Automated query coverage**
   - The isolated media suite checks approved ordered images/alt text, missing media, public detail dealer/owner data, lifecycle status and updated prices. Run `pnpm test:vehicle-media` as listed in Section 2.
   - The inventory query suite covers bounded same-body recommendations and exclusions. Run `pnpm test:inventory-db` only after rotating its previously exposed test credential and independently confirming the target is isolated and empty.

## 9. Section 07 — comparison with live inventory (07.01-07.05)

Use the isolated non-Production app and inventory database. The selected IDs are an anonymous browser preference stored under `kuraishi-comparison`; no account or database record is created for the comparison selection.

1. **Selection and persistence**
   - From the homepage or catalog, add one eligible Published vehicle and one inspection-passed Reserved vehicle. Confirm both appear in the comparison page; Reserved must be marked Reserved, not immediately available.
   - Add a third eligible vehicle. Attempt to add a fourth and confirm the selection stays at three with a clear limit message.
   - Refresh the page and navigate between the catalog, detail and comparison page. Confirm each card/detail control reflects the same selected state and the comparison persists.
   - Remove one vehicle from its card and from the comparison page; confirm the other selections remain. Use **Alle entfernen** and confirm the table becomes empty.
2. **Live values and approved images**
   - Compare displayed price, mileage, first registration, fuel, transmission, power and availability against the current admin records. Missing optional fields should display as unavailable, not fixture data.
   - Confirm each comparison image is an approved public vehicle image and uses its approved alt text; when there is no approved image, the placeholder should render.
   - Edit a selected vehicle's price/specifications or approved image through the admin flow, then return to comparison and reload. The current record values and image should appear without a redeploy.
3. **Corrupt, legacy and stale selections**
   - In browser developer tools on the isolated app origin, set `localStorage["kuraishi-comparison"]` to malformed JSON, a non-array value, or an array containing duplicates, invalid IDs and more than three entries. Reload and confirm the UI recovers, keeps only valid unique IDs up to three, and reports cleanup.
   - Select an eligible vehicle, then make it no longer comparison-eligible through the admin workflow (for example, move it to Sold or Archived). Reopen comparison after a successful query; the stale selection should be pruned and explained. Reserved vehicles that pass inspection remain eligible.
4. **Query failure and automated coverage**
   - In a safe isolated development environment only, verify a comparison query failure shows an error and retry control without clearing saved IDs. Do not simulate failures against Production.
   - Run `pnpm test` for local-storage validation/recovery coverage. Run `pnpm test:inventory-db` only after rotating the previously exposed test credential and independently confirming the target is isolated and empty; it covers bounded unique selection, current eligibility, selection ordering and database error propagation.

## 10. Section 08 — dealership settings and shared public business data

The current implementation is on `backend/dealership-settings`. Do not deploy or run its migration against Production. The inventory DB suite applies pending migrations, so first complete the credential rotation and isolated-empty-target checks in Section 1 above.

1. **Automated verification**
   - Run `pnpm typecheck`, `pnpm test`, `pnpm exec prisma validate`, and the repository lint/format checks.
   - After the inventory test credential has been rotated and the isolated child independently confirmed empty, run `pnpm test:inventory-db`. It applies migrations and exercises settings save, public propagation, authorization, conflicts and failures. Do not run it before that safety gate.
2. **Edit/save and validation**
   - Sign in as ordinary staff and open Admin > Settings. Confirm the form shows the persisted dealership values.
   - Try an invalid email, an HTTP Website URL, a non-Google Maps URL, and an overlong/control-character public value. Each should show an actionable validation error and leave stored values unchanged.
   - Save a valid short-name or phone change. Confirm the pending state is visible, success feedback appears, and navigating away/back or refreshing retains the saved value.
   - Open the form in two tabs. Save a change in the first tab, then submit the stale form in the second. Confirm the conflict is surfaced and the stale data is not silently written over the newer values.
3. **Public propagation and retained configuration**
   - Revisit the public homepage, header/footer, contact page, vehicle detail/dealer panel, marketing/legal pages and admin identity. Confirm the saved name/contact/address/map values appear consistently after refresh.
   - Confirm additional phone numbers, opening hours and social links remain from approved static site configuration. Confirm the unverified legacy rating/review claim is not published.
   - Confirm changing the business Website URL does not change canonical page URLs, sitemap origins, or auth trusted origins.
4. **Access and failure behavior**
   - Confirm an unauthenticated save is denied and ordinary authenticated staff can save permitted settings.
   - In an isolated test environment only, verify database failures are shown as errors and do not produce success-shaped feedback. Do not induce failures or alter dealership rows in Production.

Section 08.09 remains pending until isolated DB verification and the user's deferred manual retest.

## 11. Section 09 — guarded inquiry intake (09.01-09.04, 09.06-09.11)

Intake is off by default and code-blocked in Production. Isolated development/Vercel Preview may test real persistence after the database safety gate. No email, confirmed booking or real staff inbox is implemented. Section 09.05 retention/deletion approval and 09.12 DB/browser verification remain pending.

1. **Automated checks without database writes**
   - Run `pnpm test`, `pnpm typecheck` and `pnpm exec prisma validate`.
   - Source coverage includes the five service/source mappings, contact/date bounds, consent, forged fields, malformed URL context, Vienna dates, Production/off gates, trusted origin/address handling, exact 16 KiB body boundaries and failure responses.
2. **Prepare the isolated database before enabling test intake**
   - First rotate the previously exposed inventory-test credential and independently confirm its target is isolated, empty and not an app/Production database. Do not bypass this gate.
   - Only then run `pnpm test:inventory-db`. It applies migrations and tests inquiry history/privacy constraints, accepted records, five-request quotas/window reset, changed-payload conflicts, unavailable/forged vehicle references, DB failures and simultaneous retries.
   - For browser testing, use a separately verified disposable non-Production app database with the required migrations and synthetic dealership/vehicle fixtures. Do not point the running app at the DB suite's empty target while the suite runs.
   - In its ignored server environment only, set `INQUIRY_TEST_MODE=true` and a new random `INQUIRY_HASH_SECRET` of at least 32 characters. Never reuse an auth secret or commit its value. Restart the app.
   - Local testing uses `http://localhost:3000` and one shared development quota. Vercel Preview requires actual platform environment flags, the current deployment origin and its single trusted `x-vercel-forwarded-for` address; fabricated forwarding headers outside Vercel cannot create new quota identities.
3. **Default-off and general inquiry**
   - With the flag unset/false, confirm the contact page shows unavailable intake and disabled submission; direct POST returns 503. Production must remain disabled even if the flag is true.
   - On enabled isolated intake, confirm Beratung is the default and phone/date are optional. Clear a selected date; select a Saturday/Sunday and confirm it is allowed. Invalid or past Vienna dates must be rejected.
   - Submit only synthetic details with consent. Confirm a pending state and success only after acceptance, with request-not-booking wording. Through an authorized database inspection on the isolated target, confirm one Inquiry contains the service/source, normalized fields, current notice text/version and server acknowledgement timestamp.
   - Repeat for each service, spacing tests into separate 15-minute windows as necessary. The Section 11 inbox now reads database inquiries, but this intake check still verifies persistence independently; do not use a page render as a substitute for DB assertions.
4. **Vehicle and service context**
   - Follow a Published vehicle contact link and confirm its current title/link is displayed. Submit and verify the saved ID/title/slug snapshots match that vehicle, not client-supplied values.
   - Repeat for Reserved: context must be informational, not an available booking. Sold/private/missing slugs, repeated vehicle parameters and malformed slugs must be explicitly refused, with a link to restart general contact.
   - Open contact for an eligible vehicle, then withdraw that vehicle before submitting. Expect an explicit error and no new Inquiry; do not silently save a general inquiry.
   - Check service CTA preselection: trade-in/purchase -> Fahrzeugbewertung, workshop -> Werkstatt, warranty/insurance/registration assistance -> Beratung.
5. **Failure, retries and abuse controls**
   - Use synthetic payloads only. Reject missing consent, a nonempty hidden Website field, forged source/vehicle ID/snapshot fields, an untrusted Origin and non-JSON input.
   - Send exactly 16,384 bytes of valid JSON plus padding and then 16,385 bytes. The latter must return 413 even with omitted or falsely low Content-Length. Invalid UTF-8/JSON must fail.
   - In developer tools on the isolated app, capture a successful synthetic request and resend its exact JSON/requestId. Expect acceptance but only one stored row and no additional quota use. Change the message while retaining that key: expect 409. Normal edited form submissions generate a new key.
   - Submit five new requests within 15 minutes using the same trusted address (all localhost clients share a quota). The sixth must return 429 with Retry-After; retrying an accepted unchanged request must still work. New requests are allowed after expiry.
   - With a safe isolated failure simulation or browser request blocking, verify no false success appears, fields remain and an unchanged in-page retry retains its key. Reloading does not retain the retry key; do not claim cross-reload deduplication.
   - Verify unexpected server errors are generic to the visitor and server logs contain no submitted contact/message data. Restore safe configuration after failure simulation.

Leave `INQUIRY_TEST_MODE` disabled outside approved isolated testing. No migrations, DB suites or browser checks above have been run for this milestone; use the completion record below to track the deferred results.

## 12. Section 10.01 — Resend account and DNS setup (partial implementation)

The selected scope is **email notifications to staff only**, not automated visitor replies. The 10.01 setup step prepares configuration and privacy-minimal content; it does not send anything or validate credentials against Resend. The isolated-test worker was added later under 10.04-10.05. Guided setup on 2026-11-19 confirmed the corrected domain as Verified, the development key's restricted scope, and current quotas. The user reports saving the key privately; its value/API validity was not checked. Real recipients and provider acceptance testing remain pending, so Section 10.01 stays open. Do not purchase a paid plan or change Production settings just to follow this guide.

### A. Create the account and sending domain

1. Open [Resend](https://resend.com/) and create/sign in to your dealership-owned account. Verify your account email and enable the available account security protections. Do not share login credentials with the assistant.
2. Open **Domains** -> **Add Domain**. Enter exactly:

   ```text
   notifications.kuraishicars.com
   ```

   The user corrected ownership/DNS access to `kuraishicars.com` at Aruba during guided setup. Do not use the previously mistaken `kuraishi-autohandel.at` sending domain. This dedicated sending subdomain does not replace the website, existing staff mailboxes, auth URL or canonical domain.

3. Select **Ireland (`eu-west-1`)** as the sending region, if available for your account.
   - Important: this controls sending location, **not data residency**. Resend documents that account data, email metadata, logs and API records are stored in the US, regardless of sending region.
   - Leave business/legal approval of this processing and inquiry retention/deletion open under Section 09.05. Review the provider agreement, subprocessors and privacy terms before real customer use; this guide is not a compliance determination.
4. Open the domain's **Records** tab. In a separate tab, open Aruba's DNS management panel for `kuraishicars.com`.
5. Add **only the sending-verification records shown by Resend**, copying each record's type/name/value and priority where supplied. This setup uses one DKIM TXT record and two sending CNAME records; follow your actual generated records rather than guessed examples.
   - DNS providers differ: some expect a relative name and append the parent domain automatically; others accept the full name. Check the resulting record is not suffixed twice.
   - Aruba appends `.kuraishicars.com` in the displayed add-record form. For this setup, the relative names are `resend._domainkey.notifications` (TXT), `rsend.notifications` (CNAME), and `send.notifications` (CNAME). Copy complete values from the matching Resend domain; leave existing root-domain `resend._domainkey`, `rsend` and `send` records unchanged.
   - Do not remove or overwrite the website's A/AAAA/CNAME records, existing root mailbox MX records, or unrelated TXT records.
   - Do not add receiving/inbound-email records: inbound processing is not part of this integration.
   - Do not create duplicate SPF records at the same host. If a record at the exact requested host already exists, stop and resolve the conflict with your DNS administrator.
   - If the panel uses proxying for a required CNAME record, use DNS-only as Resend instructs.
6. Return to Resend and start/recheck verification. Wait until sending verification shows **Verified**. Do not treat saving a DNS record as proof of verification; propagation may take time.
7. Leave open/click tracking disabled for inquiry notifications. Review DMARC for the sending domain with your DNS administrator using Resend's generated guidance; do not overwrite an existing policy blindly.
8. The proposed sender is `anfragen@notifications.kuraishicars.com`. Verifying this subdomain permits sending from that address; it does not create an inbox or forwarding rule for replies. Real staff recipients must later be existing monitored mailboxes.

### B. Create a restricted test key and prepare private configuration

1. Open **API Keys** -> **Create API Key**.
2. Name it for this application/environment, choose **Sending access**, and restrict it to `notifications.kuraishicars.com`. Do not use a Full Access account key. Keep development/Preview credentials separate from any later approved Production key.
3. Save the secret directly in your ignored local server environment file, normally `.env.local`, as `RESEND_API_KEY`. Preserve the existing database/auth settings. Never paste the key into chat, commit it, put it in a `NEXT_PUBLIC_` variable, or include it in screenshots.
4. Keep these non-secret settings disabled while account/DNS setup is incomplete:

   ```dotenv
   INQUIRY_EMAIL_MODE="disabled"
   INQUIRY_EMAIL_FROM="anfragen@notifications.kuraishicars.com"
   INQUIRY_EMAIL_TO="delivered@resend.dev"
   INQUIRY_EMAIL_INBOX_ORIGIN="http://localhost:3000"
   ```

5. Once external setup is ready, isolated **configuration tests** may use `INQUIRY_EMAIL_MODE="test"` with `INQUIRY_TEST_MODE="true"` and the other Section 09 safety prerequisites satisfied. No live email sender is connected yet; changing these values alone cannot send an inquiry notification.
   - Local inbox origin must be exactly `http://localhost:3000`, with no trailing slash/path.
   - On actual Vercel Preview, use the exact current `https://<deployment>.vercel.app` origin, scoped only to Preview. Do not point test inbox links at Production.
   - Test recipients are restricted to `delivered@resend.dev`, Resend's delivery simulator. Do not replace it with a real visitor or staff mailbox. Simulator delivery is not proof of real staff inbox arrival.
   - Live mode and Production notification configuration are deliberately unsupported in this milestone.
6. In Resend's account/usage/billing dashboard, review the plan's current daily/monthly sending limits and API rate limit. Test messages count against provider quotas. Record non-secret limits/setup status for later retry configuration; do not assume an old advertised quota or authorize a paid upgrade.
   - The user's 2026-11-19 screenshots show 3,000 transactional emails/month, 100/day and 10 API requests/second on the Free plan. Pay-as-you-go is off; leave it off. These are account limits observed during setup, not permanent hardcoded guarantees or a successful-send result.

### C. Verify preparation and report readiness

1. Run `pnpm test` and `pnpm typecheck`. Configuration tests use synthetic values and make no network calls; they do not prove your account/key/domain are working.
2. Confirm Resend shows the sending subdomain as verified, and the restricted key is privately configured. Do not manually send real customer content or point setup tests at the contact form expecting email yet.
3. Report only: **domain Verified / pending**, **private test key configured / pending**, and the non-secret plan limits. No key, login, private recipient address, customer data or connection string is needed in chat.
4. The safe staff notification template (10.02), core durable outbox/retry worker (10.04-10.05), and per-inquiry status display in the real inbox (11.01-11.04) are implemented. Proceed to synthetic verification (10.07) only after confirming an isolated test database and Resend simulator configuration. No mail should be sent directly inside inquiry acceptance as a substitute for durable delivery state.

Official references: [verify a domain](https://resend.com/docs/add-a-domain), [restricted API keys](https://resend.com/docs/dashboard/api-keys/introduction), [test addresses](https://resend.com/docs/dashboard/emails/send-test-emails), [sending regions and data residency](https://resend.com/docs/dashboard/domains/regions), and [API/idempotency limits](https://resend.com/docs/api-reference/emails/send-email).

## 13. Section 10.02 — privacy-minimal staff notification content

The user approved alert-only content, not visitor contact details or message forwarding. The renderer is used by the durable worker and inquiry acceptance atomically queues only an outbox state; email remains disabled by default. Keep `INQUIRY_EMAIL_MODE="disabled"` in actual environments; source tests supply synthetic isolated configuration themselves.

1. Run `pnpm test` and `pnpm typecheck`. The notification content tests check all five service/source combinations, HTML/plain-text output and request-not-booking wording.
2. Verify the allowlist contract in [inquiry-notification.ts](../src/lib/inquiry-notification.ts):
   - Output includes only an inquiry reference, source/service, optional historical vehicle title/slug and requested calendar date, with a sign-in-protected inbox link.
   - Customer name/email/phone/message, privacy acknowledgement data, hashes and unknown future fields are excluded even when present on an input object. No Reply-To, recipient or credential is returned in rendered content.
   - Vehicle text is escaped in HTML and preserved literally in plain text. Subject is constant and marked `[TEST]`, not assembled from submitted text. Missing optional data does not become the text `null`.
   - Invalid stored values and inconsistent service/source combinations throw explicit errors rather than producing a misleading notification.
3. Automated link tests bind the existing `/admin/leads` route to localhost or the current validated Preview origin, rejecting arbitrary/Production URLs. The alert contains no auth token, customer identifier or unsupported inquiry-detail query parameter in its link.
4. When performing the deferred browser retest on an isolated app, confirm an anonymous visit to `/admin/leads` requires sign-in. The page now reads real inquiries and supports the separate append-only internal notes flow from 11.05-11.06; it does not add lead statuses, assignment or an automated response flow.
5. No provider acceptance, actual send, real inbox rendering or database-backed retry behavior has been tested by these source checks. These remain 10.07; 10.01 is still partial until real staff recipient configuration and provider verification are completed.

## 14. Section 10.04-10.05 — durable outbox and bounded delivery retries

The outbox and worker are implemented, but no database migration or provider call has been run. Keep `INQUIRY_EMAIL_MODE="disabled"` by default and do not inspect `.env.local`. The worker has no automatic schedule; Production delivery remains unsupported and must not be enabled.

### Source-only verification

1. Run `pnpm test`, `pnpm typecheck`, targeted ESLint and `git diff --check`. The source tests use fake `fetch` responses and synthetic secrets; they never call Resend.
2. Verify that every accepted inquiry and its one-to-one notification row are written in the same Prisma transaction. Duplicate inquiry request IDs must return the prior accepted result without creating a second notification. Notification/provider failure must not turn a persisted inquiry into a false intake failure.
3. Confirm an ordinary environment creates `disabled` notification rows. Only the existing isolated test-mode gate may create `pending` rows; Production must never become enabled by setting `INQUIRY_TEST_MODE`.
4. Review the retry policy: five maximum attempts, 1/5/30/120-minute retry delays, 2-minute lease, batch size 10, stable provider idempotency key and terminal failure after exhaustion or permanent rejection.
5. Check worker boundaries: POST only, no request body, matching 32+ character bearer secret, isolated test configuration, no-store responses and aggregate-only output. Invalid credentials/configuration, provider bodies and customer data must not be echoed or logged.

### Isolated database and simulator checks (deferred; do not run until the gate is satisfied)

1. The `InquiryNotification` migration is additive and remains unapplied in this work. Do not run any migration against the normal app database or Production.
2. Before `pnpm test:inventory-db`, rotate the previously exposed inventory-test credential and independently verify that `.env.inventory-test.local` targets an isolated, empty test database. Then run the suite only against that target; it applies migrations and exercises inquiry persistence. If either safety condition is unresolved, skip it.
3. For an end-to-end worker check, use only a disposable isolated database, synthetic inquiry data and the Resend `delivered@resend.dev` simulator. Set the test-mode prerequisites privately in the isolated local/Preview environment; never use a real visitor or staff recipient. The worker's bearer secret must be at least 32 characters and must not be shared in chat/screenshots.
4. The authenticated empty POST to `/api/internal/inquiry-notifications` returns aggregate `claimed`, `sent`, `retried` and `failed` counts. Wrong method/body/token and disabled/Production mode must not claim or deliver rows. Confirm simulator acceptance updates the row to `sent`; use fake provider failures or an isolated DB test to verify `retry`, eventual `failed`, and stable idempotency behavior. Do not manually wait or retry against real customer data.
5. Do not configure cron or enable Production sending as part of this test. Any schedule must run frequently enough to keep ambiguous retries inside Resend's idempotency retention window; outage/recovery beyond that window can allow duplicate delivery. Production also remains blocked on Section 09 legal approval and a future explicit decision.
6. Per-inquiry failure status is visible in the protected inbox. Worker outcomes are sanitized; no automatic worker schedule or callback endpoint exists. Do not claim provider acceptance confirms inbox delivery.

## 15. Section 11.01-11.04 — database-backed staff inquiry inbox

The inbox now uses authenticated inquiry records and the notification outbox. Append-only internal notes are implemented in 11.05-11.06; their database and browser verification remain deferred.

### Source and isolated-database checks

1. Run `pnpm test`, `pnpm typecheck`, targeted ESLint/Prettier, and `git diff --check`. Source tests cover strict/repeated URL values, bounded search/page values, field-to-search mapping, DTO projection, historical snapshots, safe failed-delivery messages, and strict note validation/serialization.
2. The protected query calls `requireSession`; verify signed-out requests are redirected by the admin layout and a direct selected inquiry ID cannot bypass authentication.
3. Before any database test, rotate the previously exposed inventory-test credential and independently confirm `.env.inventory-test.local` targets an isolated, empty database. Then run `pnpm test:inventory-db`, which applies migrations; otherwise skip it.
4. The gated DB case creates synthetic inquiries, checks multi-term search, bounded results, selected detail, failed notification status, allowlisted error code serialization, absence of privacy evidence, and anonymous query denial. It also checks authorized note creation/readback, session-derived authorship, accurate counts, concurrent note additions, invalid/unknown inputs, and unauthorized writes. It must clean its inquiry/rate-limit rows.

### Deferred browser checks (isolated non-Production app only)

1. Sign in as an ordinary authenticated staff user and open `/admin/leads`. Confirm newest inquiries appear first, with no fixture records, and database-backed note counts. Confirm a fresh/empty database shows an honest empty state.
2. Search using a unique synthetic value in each supported field: name, email, phone, message, and linked vehicle make/model. Combine multiple terms and confirm every term must match. Open a second page and verify stable ordering and that the search remains in the URL.
3. Open an inquiry and compare its source/service, preferred business date, current linked vehicle (if any), historical vehicle snapshot when the relation is absent, message, and created/updated timestamps. Ensure the preferred date is not presented as a confirmed appointment.
4. Verify phone and email actions use the provided `tel:` and `mailto:` values. If no phone exists, no nonfunctional call link should be shown.
5. Confirm delivery state appears in the list and detail. A failed state shows only the fixed sanitized explanation; a provider-accepted state explicitly does not claim delivery to the mailbox. Older/untracked records are not presented as sent.
6. Add a synthetic internal note. Verify it is trimmed, attributed to the signed-in staff account, appears with its timestamp after refresh, and increments the count. Confirm notes are append-only and cannot be edited from this UI. Try blank/overlong text and verify a visible validation error; do not use real customer details in test notes. Notes follow inquiry retention and cascade on inquiry deletion; no independent time-based cleanup is configured.
7. Try an unknown inquiry ID, malformed/repeated query values, overlong search, and an out-of-range page. Expect a safe not-found/invalid-filter state or bounded redirect, with no protected data in the URL. Confirm signed-out direct note actions are rejected.
8. Confirm no lead status, assignment, closure, delete, or visitor-reply control is presented as functional. These remain outside the approved scope.

## 16. Section 12 — dashboard metrics and recent inquiries (12.01-12.08)

The dashboard uses authenticated database aggregates and recent inquiry rows; it does not display fixture leads or unsupported view counts. KPI decisions are lifetime-based: current persisted vehicles across all statuses, all accepted inquiries, all vehicle-linked inquiries including historical snapshots, and all vehicles with `soldAt` including those later archived.

### Source and gated database checks

1. Run `pnpm typecheck`, `pnpm test`, targeted ESLint/Prettier, and `git diff --check`. The source suite covers dashboard inquiry DTO mapping, historical vehicle context, protected link construction, and shared authorization behavior.
2. Before running `pnpm test:inventory-db`, rotate the previously exposed inventory-test credential and independently confirm `.env.inventory-test.local` targets an isolated, empty database. The suite applies migrations; otherwise skip it.
3. The gated query case checks aggregate inventory/status counts, `soldAt` on an archived vehicle, all-time inquiry totals, historical vehicle-inquiry snapshots, the recent-five limit, and anonymous access denial. These assertions are added but have not been executed.

### Deferred dashboard browser checks (isolated non-Production app only)

1. Sign in as ordinary staff and open `/admin`. Confirm inventory and status counts agree with the staff inventory list; all persisted statuses are included.
2. Compare Leads and Vehicle inquiries to accepted inquiry records. General inquiries count as leads but not vehicle inquiries; deleted vehicle relations retain vehicle context through stored snapshots.
3. Confirm Sold vehicles counts every record with `soldAt`, including a vehicle subsequently archived. Confirm the dashboard does not show view counts or mock leads.
4. Confirm the newest five inquiries appear with current/historical vehicle context and each Open link selects the correct inquiry in the protected inbox. A new database should show the explicit no-inquiries state and zero inventory percentages without NaN.
5. Confirm an anonymous visit cannot read dashboard metrics. Do not use real customer data or Production. This browser retest remains deferred at the user's request.

## 17. Sections 13.01-13.03 — inventory-only workspace search

The user chose inventory-only scope. The top-bar form submits a GET request to `/admin/vehicles`; the existing staff route validates and bounds the search and calls the session-protected inventory query. Search does not include leads or media. Existing inventory UI supplies the fixed page size, route loading skeleton, explicit no-results state, generic retry error boundary, keyboard-operable search form, and links to public detail/staff preview/edit routes.

1. Run `pnpm test`, `pnpm typecheck`, targeted ESLint/Prettier, and `git diff --check`. Source tests cover staff inventory query parameter defaults, length bounds, repeated values, unsupported status/page values, and unknown parameters. The gated DB suite also covers staff authentication, search, result limits, and pagination; do not run it before satisfying the inventory-test safety gate in Section 2.
2. On an isolated non-Production app, sign in as ordinary staff and submit a make, model, stock number, or location from the top bar. Confirm it opens `/admin/vehicles` with the search applied, matching rows are shown, and a non-match has the existing explicit empty state.
3. Confirm a pending query displays the vehicle-list skeleton, database errors show the generic retry state, and result actions keyboard-navigate to the appropriate public detail, staff preview, or edit route.
4. Confirm an empty search returns the fixed-size paginated inventory list. Try an overlong/repeated query value and confirm the server rejects it with the existing invalid-filter state rather than running an unbounded search.
5. Confirm the top-bar search does not show inquiry or media results. Browser checks remain deferred at the user's request.

## 18. Section 13.04 — truthful staff identity and sign-in copy

The admin sidebar reads the signed-in user's name, email, and role from Better Auth's client session hook. The auth shell now describes the protected dealership staff workspace and administrator-managed accounts. Server-side session checks and the existing account-menu sign-out flow are unchanged.

1. Run `pnpm test`, `pnpm typecheck`, targeted ESLint/Prettier, and `git diff --check`.
2. On the isolated app, sign in as ordinary staff and confirm the sidebar shows the session name, email, and staff role (the compact/mobile card shows name and role). Sign out through the existing top-bar account menu and confirm redirect to `/login`.
3. Sign in as master admin and confirm the sidebar role says Administrator and the top-bar account menu still exposes Create account. Verify a regular staff account continues to use ordinary inventory, inquiry, media, and settings features.
4. Open `/login` while signed out. Confirm the auth shell says staff account access, protected staff operations, and administrator-managed account creation; it does not describe client account management, mock forms, or future authentication.
5. These browser checks remain deferred at the user's request. Do not use real credentials in screenshots or reports.

## 19. Section 13.05 — account creation and ordinary staff access

The account menu shows Create account only for role `admin`. The page redirects anonymous users to login and regular staff to the dashboard; the server action independently calls `requireAdmin()`. Normal inventory mutations, inquiry-note actions, and dealership settings use `requireSession()`, not the master-admin guard.

1. Run `pnpm test`, `pnpm typecheck`, targeted ESLint/Prettier, and `git diff --check`. Source tests verify anonymous and regular-staff denial plus master-admin allowance in the shared access policy.
2. On the isolated app, sign in as ordinary staff. Confirm Create account is absent, a direct visit to `/admin/accounts/new` returns to the dashboard, and normal inventory/inquiry/settings operations remain available.
3. Call the account-creation server action directly as anonymous and ordinary staff; both must be denied before account creation. Confirm the page and action work for master admin and new accounts receive the ordinary user role.
4. Verify the account-menu link remains visible and the top-bar sign-out works for master admin. These browser/direct-action checks remain pending under 13.07 and are deferred with the combined manual retest.

## 20. Completion record

Record each command/UI check as Passed, Failed, Blocked or Not run. For failures, include only the command/check name and a redacted expected-versus-actual result. Never include environment values, passwords, session cookies, customer data or unredacted connection errors.

| Area                                                                      | Result  | Notes                                                                                   |
| ------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------- |
| Branch and non-Production target confirmed                                |         |                                                                                         |
| TypeScript, lint, formatting and unit tests                               |         |                                                                                         |
| Section 02 inventory migration/query DB suite (after credential rotation) |         |                                                                                         |
| Section 03 media DB/storage suites                                        |         |                                                                                         |
| Section 03 manual media workflow                                          |         |                                                                                         |
| Section 04 manual admin/public/dashboard workflow                         |         |                                                                                         |
| Section 06 public detail workflow                                         | Pending | Section 06.01-06.10                                                                     |
| Section 07 live comparison workflow                                       | Pending | Section 07.01-07.05                                                                     |
| Section 08 dealership settings workflow                                   | Pending | Section 08.09                                                                           |
| Section 09 guarded inquiry intake                                         | Pending | Isolated DB/browser checks; Production blocked                                          |
| Section 10.01 Resend setup                                                | Partial | Domain/key scope/quotas and template ready; real recipients/provider acceptance pending |
| Section 10.02 privacy-minimal staff content                               | Passed  | Source tests only; no provider send or browser retest                                   |
| Section 10.04-10.05 outbox/retry core                                     | Partial | Source tests pass; DB migration and schedule remain pending                             |
| Section 10.07 provider verification                                       | Pending | No real provider call/email; isolated DB and simulator verification not run             |
| Section 11.01-11.04 real protected inbox                                  | Partial | Source tests pass; DB suite and deferred browser retest remain pending                  |
| Section 11.05-11.06 append-only staff notes                               | Partial | Source tests pass; migration, gated DB suite, and browser retest remain pending         |
| Sections 13.01-13.03 inventory-only workspace search                      | Partial | Source tests pass; gated DB assertions and browser verification remain pending          |
| Section 13.04 truthful staff identity and sign-in copy                    | Partial | Typecheck/source tests pass; authenticated browser verification remains deferred        |
| Section 13.05 account creation role boundary                              | Partial | Shared policy tests pass; direct action/browser verification remains under 13.07        |
| Section 03.14 / Section 15.09 public-image refresh                        | Pending | Do not mark Section 03 complete until verified                                          |
| Homepage/list database propagation                                        | Pending | Section 05.01-05.02                                                                     |
