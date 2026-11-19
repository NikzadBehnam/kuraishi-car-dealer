# Full test guide for implemented checklist sections

This guide covers implemented work on `backend/public-vehicle-catalog`, which includes the integrated Section 04 branch:

- Section 01: approved business rules and pure policy/auth contracts.
- Section 02: inventory schema, migration, queries, search, DTOs and controlled fixture-import logic.
- Section 03.01-03.13: media storage, upload, approval, relationships, library, downloads and deletion.
- Section 04.01-04.17: staff inventory, vehicle mutations, lifecycle, authorization, public detail and live dashboard counts.
- Section 05.01-05.06 and 05.08-05.09: live homepage/catalog inventory, bounded search, URL navigation, pagination and public eligibility.

Section 04 is complete but was not merged to `master` before Section 05 began; this Section 05 branch retains the Section 04 commits for the combined retest. Section 03.14 is still incomplete pending the public-image-refresh check in Section 15.09. Section 05.07's optional filter/sort controls were not approved and are not implemented. Sections 06 and later are not covered here. Comparison selection is still stored in the browser, but resolving those IDs to live inventory belongs to Section 07.

## 1. Safety and prerequisites

1. Use the Section 05 branch, not `master`:

   ```powershell
   git branch --show-current
   git status --short --branch
   ```

   The branch should be `backend/public-vehicle-catalog`. It includes the Section 04 integration so both sections can be tested together. Preserve unrelated local work; do not switch branches over uncommitted changes.

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
   - Verify homepage/catalog propagation in Section 05 below. Lead metrics remain UI-only, and resolving comparison IDs to live inventory remains Section 07.

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
   - Comparison controls retain their existing browser behavior, but a full live comparison table is not expected until Section 07.

## 8. Completion record

Record each command/UI check as Passed, Failed, Blocked or Not run. For failures, include only the command/check name and a redacted expected-versus-actual result. Never include environment values, passwords, session cookies, customer data or unredacted connection errors.

| Area                                                                      | Result  | Notes                                          |
| ------------------------------------------------------------------------- | ------- | ---------------------------------------------- |
| Branch and non-Production target confirmed                                |         |                                                |
| TypeScript, lint, formatting and unit tests                               |         |                                                |
| Section 02 inventory migration/query DB suite (after credential rotation) |         |                                                |
| Section 03 media DB/storage suites                                        |         |                                                |
| Section 03 manual media workflow                                          |         |                                                |
| Section 04 manual admin/public/dashboard workflow                         |         |                                                |
| Section 03.14 / Section 15.09 public-image refresh                        | Pending | Do not mark Section 03 complete until verified |
| Homepage/list database propagation                                        | Pending | Section 05.01-05.02                            |
