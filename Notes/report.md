# First-Version Finalization Review

- **Reviewed:** 2026-11-20
- **Branch / revision:** `test/backend-integration-and-release` / `466f70e`
  **Checklist reviewed:** [Checklist.md](./Checklist.md), cross-checked with the [implemented-sections test guide](./Implemented-Sections-Test-Guide.md), [README](../README.md), and [operations runbook](./Operations-and-Recovery-Runbook.md).

## Executive status

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

The list below includes **every unchecked item** in the current checklist (**25 items** after completing 16.13). “Release gate” means it must be completed or explicitly excluded from the agreed v1 scope before launch; conditional and unapproved items are not authorization to build extra features.

After each point is verified and marked complete in [Checklist.md](./Checklist.md), update this report in the same change: move the point to **Completed since the initial review**, tick it, record the verification result, and update the remaining count.

### Release gates and decisions

- [ ] **09.05 — Inquiry evidence retention/deletion.** Obtain business/legal approval for customer-data retention and deletion. Capturing the acknowledged notice text/version and timestamp is implemented; the retention period and deletion/anonymization procedure are not approved. This also blocks **11.07**.
- [ ] **14.01 — Truthful launch content.** Confirm legal business identity/contact details and approved public claims. The legal identity is still placeholder-only; stock imagery is labeled illustrative, but its external-use policy remains unresolved.
- [ ] **14.03 — Final legal copy.** Qualified counsel must review and replace the placeholder imprint, privacy, terms, and cookie content before Production use. See [legal-pages.ts](../src/content/de/legal-pages.ts).
- [ ] **16.06 — Approved live data.** Obtain the approved stock, dealership, and media source files/mapping; validate and dry-run the import, resolve duplicates/relationships, and report results before importing. No real-data import has been performed.
- [ ] **16.11 — Environment separation.** Blocked pending operator verification of the effective Production and Preview database, auth, storage, and notification settings. The prior Vercel audit saw names/scopes only and found no media settings in the visible project list. `RESEND_FROM_EMAIL` is unused; the app reads `INQUIRY_EMAIL_FROM` only for isolated simulator delivery. Follow the [read-only dashboard checks](./Operations-and-Recovery-Runbook.md#environment-separation-verification-1611) and record redacted results before closing this gate.
- [ ] **16.12 — Controlled Production migration.** Review migrations, test them on an isolated branch, confirm an approved recovery point, apply through the approved Production workflow, and regenerate Prisma Client if required. This is an operational gate, not permission to modify Production now.
- [ ] **16.14 — Production smoke test.** After deployment, validate the deployed revision, login/staff restrictions, public listing/detail, media, settings, inquiry intake and protected inbox using only approved test data/recipients.
- [ ] **16.15 — Release and rollback evidence.** Record tested revision, migration/data/storage rollback criteria, and confirm no secrets or demo customer records entered commits.
- [ ] **10.01 — Staff email readiness, only if email is part of v1.** Provider/domain/key setup is partial; the secret/API validity was not inspected, approved real staff recipients and provider acceptance are pending, and live sending is not implemented. Either finish the separately approved delivery setup or explicitly exclude email from v1 and keep it disabled. Do not send customer emails during verification.
- [ ] **11.07 — Customer-data lifecycle.** Keep projections private and follow the approved inquiry retention policy; do not add a TTL, deletion, or anonymization rule before 09.05 is approved. Lead statuses, assignment, closure, and delete controls are separate CRM scope and are not implemented.

### Verification still required for implemented flows

- [ ] **03.14 — Media end-to-end regression.** Confirm public-image refresh after replacement; the checklist records other upload, authorization, ordering, and deletion cases as covered. This final freshness case is also part of 15.09.
- [ ] **06.10 — Public detail regression.** Complete the combined browser check for unknown/nonpublic slugs, missing media, owner/dealer details, sold state, related-vehicle exclusions, and updates. The current checklist says its isolated inventory DB assertions pass; the browser portion is still deferred.
- [ ] **07.05 — Comparison regression.** Verify refresh persistence, remove/clear, maximum, corrupt/legacy storage, stale IDs, database failure, and a vehicle becoming nonpublic. DB/query coverage is reported as passing; browser retest remains.
- [ ] **08.09 — Settings regression.** Verify save/refresh/public propagation, invalid settings/URLs, ordinary staff authorization, unauthenticated denial, and canonical-domain consistency in the integrated app. DB coverage is reported as passing; browser retest remains.
- [ ] **10.07 — Notification verification.** Run isolated DB/simulator verification for retries, idempotency, environment isolation, escaping, and protected links. Synthetic source tests cover failure classes, but no real Resend request/email or DB worker test was run. Callback testing is not applicable unless callbacks are adopted.
- [ ] **11.08 — Inquiry-to-inbox regression.** Verify public submission through inbox search/detail, saved note and refresh, plus unauthorized direct actions, unknown IDs, no-vehicle leads, stale links, and note failures.
- [ ] **12.08 — Dashboard regression.** Verify counts after inventory/inquiry changes, empty periods, zero-inventory percentages, and dashboard access/error states. The current checklist records isolated DB coverage; confirm the browser behavior in the combined retest.
- [ ] **13.07 — Workspace/auth regression.** Verify search privacy/navigation, normal staff access, anonymous denial, live identity refresh, sign-out, and direct account-creation denial for ordinary staff.
- [ ] **15.09 — Public freshness/SEO regression.** In a confirmed non-Production app, verify publish/update/unpublish, image replacement, price/slug/settings changes, and removal across public pages, metadata, and sitemap. No confirmed non-Production browser URL is recorded.

### Deferred or conditional—not approved v1 requirements

- [ ] **05.07 — Extra public filters/sorts.** Explicitly optional and unapproved. Do not implement without agreement on facets, ranges, stable sorting, reset behavior, and query validation.
- [ ] **10.03 — Visitor acknowledgement email.** Deliberately outside the selected staff-notification-only scope; do not add unless separately approved.
- [ ] **10.06 — Provider callbacks.** No callback endpoint is present. This is not applicable unless callbacks are selected; if added, signature verification and duplicate/out-of-order handling are required.
- [ ] **14.06, 14.07, 14.08 — Consent preferences and effects.** Conditional on qualified legal guidance. The cookie page currently has no preference controls, and no analytics/embedded iframe is present. Do not add a consent system or gate necessary auth before the decision; if consent is required for optional resources, implement and test the actual runtime gating.

## Checklist and evidence that need reconciliation

1. The checklist’s **Review-wide findings** and **Coverage register** are stale relative to later completed sections. They still describe no business API, fixture-based sitemap/search/comparison, fake settings save, fixture leads, and placeholder dashboard metrics, while later sections and current source describe database-backed implementations. Update these as current-state documentation, not as new feature work.
2. The 2026-11-20 30-test isolated inventory run reconciled the DB status for 09.12 and the query coverage referenced by Sections 06.10, 07.05, 08.09, and 12.08; the [checklist](./Checklist.md) and [test guide](./Implemented-Sections-Test-Guide.md) now record those results. Their combined browser retests remain open. Continue to distinguish **source test**, **isolated DB test**, **browser test**, and **Production test**.
3. Keep the unapproved/deferred items above open but label them as intentional scope decisions, not unfinished v1 implementation. Do not claim completion based on a source test when the corresponding DB/browser or deployment gate is still open.
4. The test guide records a full-repository Prettier check finding 148 pre-existing unformatted files. Avoid mass-formatting unrelated files; decide whether that baseline is an accepted limitation or a separate cleanup task.

## Recommended closeout order

1. Decide and document the v1 scope for staff email, optional consent, and optional catalog filters; preserve the explicitly deferred visitor email and callbacks unless approved.
2. Complete counsel/business decisions (09.05, 14.01, 14.03) and obtain approved real data for 16.06.
3. Verify and align environment configuration under 16.11, including the sender-variable name; keep secrets private.
4. Reconcile checklist/test-guide evidence, then finish the isolated DB and combined non-Production browser retests listed above.
5. Complete the migration/recovery workflow (16.12), execute the approved manual deployment procedure (16.13) only after release authorization, then complete Production smoke/rollback evidence (16.14–16.15).

This report does not authorize a Production change, data import, migration, email send, or deployment.

## Completed since the initial review

- [x] **09.12 — Inquiry intake verification:** completed on 2026-11-20 after the isolated migration/query suite passed 30/30. It verifies durable intake, inquiry categories, quota/window reset, stale/forged vehicle context, invalid consent/date, duplicate/concurrent retries, database failures, inbox readback, and notes. The broader browser retest remains pending under 11.08 and 16.14.
- [x] **16.13 — Deployment path:** approved on 2026-11-20 and recorded in the [operations runbook](./Operations-and-Recovery-Runbook.md#manual-production-deployment-1613). Verified the documented `vercel deploy --prod` command against the Vercel CLI reference and confirmed Git deployments remain disabled. No Production deployment was run.
