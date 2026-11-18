# Dynamic application implementation roadmap

Reviewed: 2026-11-16.

## Purpose and status

This is a source-based implementation plan for making the existing admin and public website dynamic. It is not a claim that the features below have already been implemented. Unchecked items are future work; each item must later be implemented technically and verified before it is checked.

The public website is called the "client side" in this document. This does **not** imply a new customer account system, payments, reservations, or a customer portal.

### What already works

- Better Auth email/password login, database sessions, sign-out, protected dashboard access, and master-admin-only account creation have been implemented. Preserve this work rather than rebuilding authentication.
- Prisma and Neon are configured. Alongside the existing auth models, the current [schema](../prisma/schema.prisma) now includes `Dealer`, `Vehicle` and `VehicleChange` from Section 02. Their migration has been verified only on the approved isolated child, not applied to normal dev or Production. Media, extended business settings and inquiries remain later sections.
- Local UI state, demo vehicle rendering, localized routes, comparison controls, validation schemas, and browser utilities are useful foundations, not evidence that business data is persisted.
- The [auth implementation record](./BetterAuthConfiguration.md) contains previous checks. Its historical "current project state" paragraphs, the [README](../README.md), and the [handoff](../PROJECT_AI_HANDOFF.md) contain stale prototype descriptions; current source takes precedence.

### Existing authorization policy to preserve

- Any valid staff account may use ordinary dashboard features, including future inventory, media, leads, and settings operations.
- Only the master admin may create staff accounts. Do not silently make every business mutation master-admin-only.
- Each new protected query, Server Action, Route Handler, upload authorization, and mutation must validate its own session on the server. A protected layout and hidden button are not authorization.
- Public callers may read only explicitly public data and submit validated inquiries. They must never receive draft vehicles, private notes, customer records, storage credentials, or staff-only fields.
- Public self-registration, verification emails, self-service password reset, and role promotion remain out of scope unless separately approved.

## How to implement this checklist

1. Confirm the open business decisions for the selected section before coding behavior that depends on them.
2. Create that section's suggested branch from the latest merged `master`, after its dependencies are merged. Branch names are proposals; this document does not create branches.
3. Implement the section point by point within the listed milestones. Apply and verify each point, then commit and push it on the section branch before starting the next point. Decision/documentation points require explicit approval and documentation checks; code points require focused behavior tests.
4. Add focused tests for introduced behavior, run the relevant existing validation commands, and verify the actual admin-to-database-to-public flow.
5. Update this checklist with completed item IDs, evidence, remaining work, and the next section. At the end of the section, prepare a report with a full-section retest procedure, results, known limits, and commit references. Leave the merge into `master` to the agreed review/retest step; do not merge automatically.
6. Never use Production as a test database. Use an isolated development/test Neon branch for database integration tests and fixture data; apply reviewed Production migrations through the deployment procedure.
7. After an approved section merge into `master`, explicitly notify the user to test and provide a full guided checklist for that section: prerequisites/environment, commands, manual steps, expected results, known limits and pass/fail recording. Wait for the user's test confirmation before starting the next section. This post-merge gate supplements, not replaces, the pre-merge report/review in step 5.

Suggested architecture: retain the existing Next.js App Router, pnpm, Prisma, Neon, and Better Auth stack. Prefer server-only domain queries and Server Actions for the current app. Add Route Handlers only when browser uploads, public submissions, downloads, provider callbacks, or another real integration needs them. Do not add a separate API service, CMS, queue provider, or storage vendor just to satisfy this document.

## Review-wide findings

- There is no business-data API yet; the existing route handler is Better Auth's catch-all endpoint.
- Public search currently uses the [local filter helper](../src/lib/vehicle-filters.ts): all query terms must match, German display labels are searchable, case/accents are normalized, and featured cars come first. Preserve or explicitly revise this contract when moving filtering to the database.
- [Sitemap generation](../src/app/sitemap.ts) reads demo vehicles and uses the current time as every modification date. It must eventually read eligible public records and actual change timestamps.
- The canonical URL in [site configuration](../src/config/site.config.ts) differs from the Production origin in [auth configuration](../src/lib/auth.ts). Confirm the intended public domain before publishing dynamic SEO links or notifications.
- [Image configuration](../next.config.ts) allows Unsplash only. A real media provider needs an explicit trusted image configuration and storage lifecycle.
- [Vercel configuration](../vercel.json) explicitly disables Git deployments. Merging a feature branch must not be assumed to deploy it automatically.
- "All checklist items checked" in the auth record is not a guarantee of exhaustive integration coverage. Existing access-helper tests do not replace direct Server Action and live endpoint authorization tests.

## Implementation sections

The sections below separate business domains, their database work, the admin controls that write data, the public views that consume it, and the verification needed to consider the feature complete.

### Branch and dependency map

| Section | Scope                                             | Suggested branch                       | Prerequisites                          |
| ------- | ------------------------------------------------- | -------------------------------------- | -------------------------------------- |
| 01      | Business rules and backend conventions            | `backend/domain-foundation`            | Existing auth/Prisma baseline          |
| 02      | Vehicle database, reference data, queries         | `backend/vehicle-inventory`            | 01                                     |
| 03      | Uploads, media library, vehicle images            | `backend/media-library`                | 01, 02                                 |
| 04      | Admin inventory CRUD and publishing               | `backend/admin-vehicle-workflows`      | 02, 03                                 |
| 05      | Public homepage and catalog                       | `backend/public-vehicle-catalog`       | 02, 04                                 |
| 06      | Public vehicle detail and related vehicles        | `backend/public-vehicle-details`       | 03, 05, 08                             |
| 07      | Comparison with live vehicle records              | `feature/live-vehicle-comparison`      | 05, 06                                 |
| 08      | Dealership settings and public contact data       | `backend/dealership-settings`          | 01, 02                                 |
| 09      | Contact, test-drive and service inquiry intake    | `backend/inquiry-intake`               | 02, 06, 08                             |
| 10      | Inquiry notifications and delivery                | `backend/lead-notifications`           | 08, 09; provider/delivery decision     |
| 11      | Admin leads inbox and notes                       | `backend/admin-leads`                  | 09                                     |
| 12      | Dashboard metrics and vehicle views               | `backend/dashboard-metrics`            | 04, 09, 11; analytics decision         |
| 13      | Workspace search and truthful staff UI            | `feature/admin-workspace-search`       | 04, 11; 03 if media search is included |
| 14      | Public content, services, legal and consent       | `feature/public-content-and-consent`   | 08; approved content/consent decisions |
| 15      | Dynamic metadata, sitemap and cache consistency   | `backend/seo-and-cache-consistency`    | 05, 06, 08                             |
| 16      | Integration coverage, production data and release | `test/backend-integration-and-release` | All approved launch sections           |

Section numbers are stable references, not a requirement to ignore dependencies. Suggested sequence: **01 -> 02 -> 03 -> 04 -> 05 -> 08 -> 06 -> 07 -> 09 -> 11 -> 10 -> 12 -> 13 -> 14 -> 15 -> 16**. Move independent work earlier when its prerequisites are ready. Sections 10, 12, 13, and parts of 14 contain decisions or optional extensions; agree on their launch scope rather than inventing requirements.

### 01. Business rules and shared backend conventions

**Branch:** `backend/domain-foundation`.

**Current state:** admin and public types describe different slices of the same demo vehicles, and their publication/availability rules are not a database contract. Authentication exists, but business mutations and public submission conventions do not.

**Commit 1: `docs: agree inventory lifecycle and launch decisions`**

- [x] **01.01** Confirm what `draft`, `published`, `reserved`, `sold`, and `archived` mean; define legal transitions and who may trigger them under the existing staff policy. _Approved 2026-11-16; meanings and transitions are recorded below. This completes the decision/documentation point, not runtime lifecycle enforcement, which is covered by 01.07-01.10 and the inventory implementation._
- [x] **01.02** Define public eligibility independently from frontend filtering: visibility on the homepage, listing, detail page, comparison, similar vehicles, sitemap, and inquiry form must all agree. Decide whether reserved/sold vehicles keep a public detail page or disappear. _Approved 2026-11-16; the public-surface matrix below is the implementation contract. Runtime enforcement remains pending._
- [x] **01.03** Reconcile lifecycle status, `isAvailable`, `isFeatured`, and inspection state (`pending`, `in_progress`, `passed`, `failed`). Decide whether a passed inspection is a publishing prerequisite and what happens to reserved/featured cars when sold or archived. _Approved 2026-11-16; availability is derived, publication requires Passed, and non-published states cannot remain featured. See the rules below; runtime enforcement remains pending._
- [x] **01.04** Confirm single dealership versus multiple dealers. Current fixtures expose a dealer relation but only one dealer; start with the actual business requirement, not a multi-tenant marketplace design. _Approved 2026-11-16: one dealership with shared staff inventory; see the scope below._
- [x] **01.05** Confirm currency/price precision, margin visibility, stock-number uniqueness, slug change policy, delete versus archive, and whether acquisition/reservation dates are managed automatically or editable. _Approved 2026-11-16; the exact-money, identifier, deletion, and date rules below guide later schema/mutations._
- [x] **01.06** Confirm the canonical public domain, media provider and file limits, notification expectations, appointment timezone, customer-data retention, and legal/cookie ownership. Request credentials privately only when the corresponding integration is being implemented. _Approved 2026-11-16: canonical Production origin, initial media provider/limits, inbox-first scope, Europe/Vienna, and a business/legal approval gate are recorded below. The media provider and limits were superseded by the user's Section 03 approvals on 2026-11-18._

#### Approved decision 01.01: vehicle lifecycle

Approved by the user on 2026-11-16, with the instruction to use standard, proper logic.

| Status      | Meaning                                                                                                | Allowed next statuses                    |
| ----------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| `draft`     | Stock entry being prepared; may be incomplete according to later draft-validation rules.               | `published`, `archived`                  |
| `published` | Advertised inventory.                                                                                  | `draft`, `reserved`, `sold`, `archived`  |
| `reserved`  | Temporarily held for an interested buyer; no completed sale yet.                                       | `published`, `draft`, `sold`, `archived` |
| `sold`      | Completed sale. Returning to draft is an explicit correction/relisting step, not direct republication. | `archived`, `draft`                      |
| `archived`  | Inactive historical stock entry, not permanent deletion. Restore to draft before republishing.         | `draft`                                  |

- All signed-in staff, including ordinary `user` accounts and the master admin, may perform these business transitions, subject to server validation. Only staff account creation remains master-admin-only.
- Transitions absent from the table are not allowed. The future mutation layer must validate the current stored state, rather than trusting a browser-supplied previous status.
- Points 01.02 and 01.03 will separately define public visibility, availability, inspection prerequisites, and featured behavior. This decision does not bypass those requirements or make any existing fixture/public page dynamically enforce them.
- Verification for this point: explicit user approval; all five current status values covered; transition targets checked against those values; existing staff authorization policy preserved. No application, schema, or Production data changed.

#### Approved decision 01.02: public eligibility

Approved by the user on 2026-11-16. These are maximum permissions for each status; publication prerequisites and additional eligibility checks in 01.03 still apply.

| Status      | Catalog              | Detail and its metadata | Comparison           | Sitemap | Homepage featured    | Similar recommendations | Vehicle inquiry             |
| ----------- | -------------------- | ----------------------- | -------------------- | ------- | -------------------- | ----------------------- | --------------------------- |
| `draft`     | No                   | No                      | No                   | No      | No                   | No                      | No                          |
| `published` | Yes                  | Yes                     | Yes                  | Yes     | Eligible if featured | Eligible                | Yes                         |
| `reserved`  | Yes, marked Reserved | Yes, marked Reserved    | Yes, marked Reserved | Yes     | No                   | No                      | Informational only          |
| `sold`      | No                   | Yes, marked Sold        | No                   | Yes     | No                   | No                      | No; general contact instead |
| `archived`  | No                   | No                      | No                   | No      | No                   | No                      | No                          |

- Enforce this matrix on the server for direct ID/slug requests as well as discoverable links. Nonpublic records must not leak through metadata, comparison resolution, or contextual inquiry lookups.
- Reserved inventory must not be presented as immediately available; an informational inquiry is not a confirmed test drive, purchase, or reservation.
- Retain sold detail URLs and eligible sitemap entries to preserve existing links, but never advertise those cars in active stock or recommendations. General contact remains available.
- Verification for this point: explicit user approval and review across all five statuses and all seven public surfaces. This is a policy decision; the current UI/queries have not been changed to implement it yet.

#### Approved decision 01.03: availability, inspection and featured placement

- Availability is derived from lifecycle: only `published` is available. `draft`, `reserved`, `sold`, and `archived` are not available. The future form must not offer an independent flag that contradicts lifecycle.
- Publishing requires inspection `passed`; `pending`, `in_progress`, and `failed` cannot be published.
- Changing an advertised (`published`) or `reserved` vehicle's inspection away from `passed` withdraws it to `draft` in the same operation. Runtime readers must also fail closed on inconsistent legacy records rather than publicly advertise them.
- Featured is an editorial choice valid only for `published`, inspection-passed inventory. Any transition away from `published` clears it; restoration/relisting never automatically restores Featured.
- Sold detail pages remain eligible under 01.02 but never claim availability. Inspection badges must be supported by actual inspection data, not unconditional text.
- Verification: explicitly approved by the user on 2026-11-16. The withdrawal transitions are allowed by 01.01 and these rules preserve 01.02 reserved/sold visibility without advertising unavailable inventory as available. Code and regression tests remain future points.

#### Approved decision 01.04: single dealership

- One business-owned inventory and one shared dealership profile/contact record. All authenticated staff work on that inventory under the existing permissions.
- Vehicles retain a stable relationship to the dealership record, so business identity/contact settings have one source of truth.
- No independent vendor accounts, tenant isolation, dealer marketplace, or per-dealer staff permissions are included. A future multi-dealership requirement needs its own design and approval.
- Verification: explicitly approved by the user on 2026-11-16; checked against the existing single-dealer fixture and shared staff authorization model. No tenancy schema or Production changes were made.

#### Approved decision 01.05: money, identifiers, deletion and dates

- Currency is EUR, with exact two-decimal storage/calculation semantics, not binary floating-point money arithmetic. Format at the display boundary; margin estimates are staff-only.
- Trim/normalize stock-number case and enforce uniqueness across active and archived vehicles. Never silently reuse a stock number.
- Slugs are unique and editable only on never-published drafts; lock them after first publication to preserve public URLs. Sold/archived records retain their slug.
- Permanent deletion is permitted only for a never-published draft after explicit confirmation. Previously published stock must be archived rather than hard-deleted. Preserve inquiry history and shared media.
- Acquisition date defaults to today in the dealership timezone and is staff-correctable. Creation/update timestamps are server-owned; first publication is set once. Set the sale timestamp on a completed sale and clear it on an explicit return to Draft, while recording the change for traceability.
- Reservation expiry is optional and, when set, must be a future date. Automatic expiry/republication is not included; staff explicitly release or update a reservation.
- Verification: explicitly approved by the user on 2026-11-16; reviewed for consistency with lifecycle corrections, retained sold URLs, and later inquiry/media relationships. Database constraints and mutation enforcement are not implemented by this documentation point.

#### Approved decision 01.06: integration and launch boundaries

- Canonical public origin: `https://www.kuraishicars.com`. Coordinate public configuration/metadata with the existing auth origin in the appropriate later sections; no domain or deployment configuration is changed by this decision alone.
- Media provider: **Neon Object Storage**, approved by the user on 2026-11-18, superseding UploadThing. Use a private bucket by default; only explicitly approved assets may use the separate `public_read` bucket. Keep credentials server-side and branch/environment-specific.
- Approved launch upload limits: JPEG/PNG images up to 10 MiB each, at most five files per upload request, and PDF documents up to 20 MiB each. Retain the previously approved maximum of 20 images per vehicle; the five-file cap is per request, not the vehicle's total gallery. PDFs are private by default and may be public only when explicitly approved. Reject SVG, HTML, and executable files. Enforce verified content types, authorization, and storage-compatible limits during Section 03 implementation.
- Durable staff inbox handling is required. The requirement for notification emails and any sender/provider/recipient configuration will be decided in Section 10; do not silently promise email delivery.
- Dealership business timezone: `Europe/Vienna`. Store absolute instants consistently and interpret/display business dates in this timezone.
- Business/legal approval of customer-data retention and final legal/cookie content is required before public inquiry launch. No retention period or claim of legal compliance is invented here; mark that later launch gate unresolved until approved.
- Verification: the original domain, inbox, timezone and legal boundaries were supplied/approved on 2026-11-16; the user superseded the media-provider and upload-limit decisions on 2026-11-18. This decision record does not authorize Production data, storage, email, or deployment changes.

#### Implementation 01.07: domain and server boundaries

- `src/lib/inventory-policy.ts` contains pure, typed eligibility/projection rules and no secrets, request headers, database clients, or provider keys. Pure functions are testable with the existing Node runner and are not an authorization boundary.
- `getPublicVehicleVisibility()` implements 01.02 and fails closed for inspection-ineligible advertised/reserved stock. `toPublicInventoryVehicle()` explicitly selects public fields, corrects availability/featured output, and excludes existing or future staff/customer fields.
- Future staff query/mutation modules must import `server-only`, call the existing `requireSession()` themselves, and reuse `prisma` from `src/lib/db.ts`. Account provisioning continues to use `requireAdmin()`.
- Future public query modules must also remain server-only, apply equivalent eligibility in the database query before pagination/counting, and project only public fields before crossing a client/API boundary. Post-query projection is defense in depth, not a substitute for database filtering.
- Do not add a second Prisma client, speculative empty query functions, mock successful mutations, or a new transport layer. Implement real `prisma.vehicle` calls only after Section 02 creates the model, with the appropriate server auth/projection boundary.
- Section 01 policy helpers do not automatically enforce these rules in current fixture-backed pages; wiring and live database enforcement remain explicit later sections.
- Verification: three focused projection/eligibility tests and TypeScript typecheck passed. No database or live UI changes.

**Commit 2: `refactor: define server-side business operation boundaries`**

- [x] **01.07** Establish server-only query/mutation boundaries using the existing shared Prisma client and define public projections separately from staff data. _Foundation implemented in `src/lib/inventory-policy.ts`: shared public-surface eligibility and an explicit public-field allowlist, with focused projection tests. Concrete Prisma queries/mutations are deliberately deferred to 02/04 because the current schema has auth tables only; the server-only boundary contract above governs those implementations. No live inventory consumer has been migrated yet._
- [x] **01.08** Reuse Zod/server validation and the repository's error/UI patterns. Reject unsupported enum values and malformed IDs; return actionable failures, never artificial success or fallback demo data on database errors. _Implemented strict policy/ID schemas, reused status schemas in the existing form, and a typed lifecycle resolver with explicit errors. Database/transport error handling is governed below and must be wired with real operations in 02/04._
- [x] **01.09** Define transaction boundaries, uniqueness/conflict handling, pagination limits, and cache invalidation ownership. Add actor/change timestamps where business changes require traceability, without introducing a generic event system unnecessarily. _Bounded pagination is implemented/tested; the atomic-write, actor/timestamp, conflict and invalidation contract below is mandatory for Sections 02/04. No inventory database fields or writes exist yet._

**Commit 3: `test: lock business policy and authorization contracts`**

- [x] **01.10** Add focused cases for the agreed visibility/lifecycle matrix and public/private projections; explicitly test that ordinary staff retain business access and account creation remains master-admin-only. _Matrix regressions cover all five statuses, all four inspection values and featured choices across all public surfaces, plus all 25 lifecycle pairs. Existing authorization tests preserve ordinary staff access and admin-only account creation; they do not prove live business endpoints that do not yet exist._

**Done when:** the decisions above are recorded, shared server conventions are in place, and later sections have an unambiguous contract. This section does not recreate auth or create fake Production records.

#### Implementation 01.08: validation and errors

- Shared Zod status/inspection schemas are used by the existing vehicle form and policy resolver. ID validation accepts bounded opaque URL-safe identifiers without prematurely choosing UUID versus CUID; actual generator/lookup constraints belong to Section 02.
- Policy update input is a strict, nonempty subset of status, inspection and featured. Reject browser-supplied availability, prior status, timestamps and unknown fields. The full vehicle form will be mapped to validated server commands in Section 04; it is not itself a policy command.
- `resolveInventoryPolicyUpdate()` validates server-loaded policy state, checks the approved transition graph, requires passed inspection for public/reserved state, and returns inspection withdrawal plus cleared featured/availability together. This is a pure result, not a database write; persistence must commit it atomically.
- `InventoryPolicyError` exposes a stable code/status/message for illegal transitions (409) and inspection prerequisites (422). Zod errors expose actionable validation issues. Expected failures should map to the existing `{ ok: false, error }` UI result; preserve form values and never toast success on failure.
- Future database actions must handle known validation/auth/not-found/conflict failures explicitly. Unexpected database/provider errors require server-side logging without secrets/customer payloads and a safe failed UI result, never fixture fallback or fake success. No catch-all is added to pure policies.
- Verification: seven focused projection/lifecycle tests, typecheck and targeted ESLint passed. No database or live inventory workflow is claimed as tested by these pure tests.

#### Implementation 01.09: atomic operations and query limits

- The user approved default **8** records and maximum **100** per inventory query. `inventoryPaginationSchema` rejects invalid/noninteger/oversized input, defaults absent fields, and derives bounded Prisma `skip`/`take`. Reject overflowing database offsets rather than truncating/clamping. Query-string decoding belongs to the calling route; these server commands accept numbers, not coercible arbitrary strings.
- Queries must use deterministic ordering with an ID tie-breaker, and matching filters for rows/counts. Apply public eligibility before pagination/counting. Do not fetch an unbounded table then filter/slice in memory. Default admin updated-descending ordering is preserved when the query/UI are integrated.
- Section 02 must add server-owned `createdAt`/`updatedAt`, creator/updater actor references, and a monotonic vehicle `version` for optimistic concurrency. Mutations take an expected version from the loaded editor, fetch the actual current record, validate against that state, and atomically update only the matching ID/version while incrementing the version. A missing row is not found; a stale version/zero matched update is an explicit 409 conflict requiring refresh/review, not an overwrite or automatic business retry.
- In Section 04, each vehicle change is one database transaction: current-state/conflict checks, lifecycle and inspection/featured normalization, identifier constraints, media relationships where relevant, server timestamps/actor, and minimal vehicle-change history. Any failure rolls the entire vehicle operation back. Agree bulk-action atomicity in Section 04 before implementation; validate all selections and never report partial failure as full success.
- First publication time is set once; sold time is set on entering Sold, retained through archive, and cleared on explicit reopening to Draft. Keep the prior sale timestamp in the vehicle-change record when clearing it. Record vehicle, authenticated actor, occurred-at instant and relevant before/after status/inspection/sale changes; no generic event bus or unrelated audit framework is required. Never accept actor/timestamps from form input.
- Enforce stock-number/slug uniqueness in the database, including archived records. Translate known Prisma uniqueness conflicts to actionable field errors; never rely solely on preflight lookups, silently rename identifiers, or expose database internals. Handle transaction conflicts explicitly; do not retry an obsolete user decision silently.
- The server mutation owns invalidation **after** successful commit, never before it. Inventory writes must cover affected staff detail/list/dashboard and public listing/detail/home/related/comparison/metadata/sitemap data, including old and new slug paths when applicable. Later query owners define concrete paths/tags using existing Next facilities; do not add a cache layer or fictitious invalidation calls before those queries exist.
- Storage/provider side effects cannot be made atomic with a Prisma transaction. Keep provider network calls outside the database transaction and use explicit pending/error/cleanup states as designed in Section 03; never delete shared media merely because a database action failed.
- Verification: eight focused policy/pagination tests, typecheck and targeted ESLint passed. Actual rollback, concurrent writers, actor persistence and cache freshness require isolated-database/end-to-end tests with the Section 02/04 implementations; this contract is not evidence that those integrations already work.

#### Implementation 01.10: regression coverage

- Public matrix tests exercise every lifecycle/inspection combination with Featured both on and off, including intentionally contradictory stored availability. They verify every surface and the actual projected availability, promotion and inspection badge.
- Lifecycle tests cover all 25 source/destination pairs, non-passed inspection prerequisites, atomic withdrawal, derived flags, preservation of input state, and explicit promotion only after eligibility is restored.
- A regression found that simultaneous Sold/Archived plus an inspection downgrade could bypass the approved Draft withdrawal rule. The resolver now consistently withdraws previously Published/Reserved stock to Draft on inspection downgrade, even with those simultaneous status inputs; callers must display the returned effective state rather than assume the requested destination was applied.
- Existing authorization tests verify anonymous denial, ordinary staff access, and master-admin-only account creation. Live database authorization, public APIs and account-creation endpoint integration are not newly proven by these helper tests.
- Verification: all **46 tests** passed (35 new policy tests and 11 existing tests); repository ESLint, TypeScript validation, changed-file Prettier and the final Production build passed. The pre-existing local `next-env.d.ts` edit was preserved byte-for-byte and is excluded from all section commits.

#### Section 01 delivery report and merge gate

**Status:** foundation implementation complete; **user retest accepted and merged into master** on 2026-11-17 at `a74b574`. Branch: `backend/domain-foundation`, based on `master` at `98b66c2`. Every numbered point was validated, committed and pushed separately. No deployment was performed.

| Point | Delivered scope                                                                               | Commit    |
| ----- | --------------------------------------------------------------------------------------------- | --------- |
| 01.01 | Approved lifecycle meanings/transitions and staff permissions                                 | `a2ea0dd` |
| 01.02 | Approved public-surface eligibility matrix                                                    | `83b274b` |
| 01.03 | Approved inspection, derived availability and featured rules                                  | `2759611` |
| 01.04 | Approved single-dealership scope                                                              | `03d14f6` |
| 01.05 | Approved money, identifier, deletion and date invariants                                      | `7e8e34e` |
| 01.06 | Approved domain/inbox/timezone/legal boundaries; media decisions superseded in Section 03     | `606f12e` |
| 01.07 | Typed visibility policies, safe public projections and server-boundary contract               | `c39aea3` |
| 01.08 | Strict Zod validation, lifecycle resolver, actionable errors and shared form enums            | `397421f` |
| 01.09 | Approved bounded pagination and atomic-write/conflict/cache/traceability contract             | `0dd0a57` |
| 01.10 | Full policy matrix regressions, inspection-withdrawal fix and existing auth regression checks | `827c6b3` |

**Implementation delivered**

- [Public inventory policy/projection](../src/lib/inventory-policy.ts) keeps private staff/customer properties out of public objects and derives valid availability/promotion.
- [Lifecycle resolver](../src/lib/inventory-lifecycle.ts) enforces transitions, inspection prerequisites, withdrawal and featured clearing without mutating its input.
- [Shared validation](../src/lib/inventory-validation.ts) rejects invalid IDs, unknown/forged policy fields, invalid enums and oversized pagination. The existing vehicle form reuses the same enum schemas.
- [Public projection/matrix tests](../src/lib/inventory-policy.test.ts) and [validation/lifecycle tests](../src/lib/inventory-lifecycle.test.ts) add 35 tests. The 11 existing tests, including [authorization tests](../src/lib/auth-access.test.ts), continue to pass.

**Verified by automation**

- `pnpm test`: **46 passed, 0 failed**, no skipped tests.
- `pnpm typecheck`: passed; the final build also reran TypeScript validation.
- `pnpm lint`: passed with zero warnings.
- Prettier on every changed source file and this checklist: passed.
- `pnpm build`: passed; all 46 static pages generated successfully.
- Git whitespace validation: passed. Pre-existing local `next-env.d.ts` edit remains unchanged and uncommitted.

**Known limits — not represented as completed integration**

- Prisma still has only auth models. No inventory migration, vehicle persistence, actor/history rows, transaction rollback, uniqueness enforcement, concurrency handling or live invalidation was implemented/tested against a database in Section 01.
- Public/admin inventory still reads fixtures. The new rules are reusable foundations, not yet wired into actual inventory queries/actions or public pages. Existing fixture UI claims and simulated save actions remain work for their listed sections.
- Exact database money, immutable slugs, deletion restrictions and business timestamp persistence remain Section 02/04 work under the approved contracts. The current legacy frontend money fields still use numbers.
- Existing auth helper tests do not establish end-to-end authorization for future business endpoints or re-verify the deployed account-creation endpoint.
- No Production schema/data, auth configuration, domain configuration, provider dependency or credential was changed. No deployment, merge or pull request was created. Git deployments remain disabled by existing configuration.

**Full-section retest procedure before merge**

1. Review the section branch against `master`, especially the six approved decisions and the intentionally deferred database/UI scope above. Preserve unrelated local changes when preparing your checkout.
2. Run `pnpm test`, `pnpm typecheck`, `pnpm lint` and `pnpm build` on this branch. Expect 46 passing tests and successful checks. Use private local configuration; never put credentials in the report/chat.
3. Check formatting with `pnpm exec prettier --check src\lib\inventory-policy.ts src\lib\inventory-policy.test.ts src\lib\inventory-validation.ts src\lib\inventory-lifecycle.ts src\lib\inventory-lifecycle.test.ts "src\app\(protected)\admin\vehicles\_schemas\vehicle-form.schema.ts" Notes\Checklist.md`.
4. With `pnpm serve`, smoke-test public listing/detail/comparison and the admin inventory/new/edit screens for unchanged rendering and form enum options. Existing fixture-based save/status toasts are **not** persistence verification.
5. Using existing private test accounts, manually check signed-out admin protection, ordinary staff dashboard access and account-creation denial, and master-admin account-page access. Do not create real accounts or share passwords merely to smoke-test this section.
6. Confirm no unintended files or secrets are in the branch diff. Stop the local development server when finished. Human smoke/retest approval is still pending; the automated results above do not mark it complete.
7. After acceptance, merge `backend/domain-foundation` into `master` through the agreed review process. This report does not authorize or perform a deployment. Then start **Section 02, point 02.01**, on `backend/vehicle-inventory` from the merged `master`, using isolated development/test Neon for migrations.

**Retest execution — 2026-11-17**

- Automated checks rerun: all 46 tests passed; typecheck, repository lint, changed-file Prettier, whitespace checks and Production build passed. The pre-existing local `next-env.d.ts` edit was preserved.
- A temporary local Production server rendered the homepage and login page. Browser navigation while signed out correctly redirected `/admin`, `/admin/vehicles`, `/admin/vehicles/new`, `/admin/vehicles/1/edit` and `/admin/accounts/new` to login, retaining the appropriate return path.
- Initial public navigation failed with redirect loops. **Correction after investigation:** this was caused by the retest server being started with `--hostname 127.0.0.1`, not an application routing defect. Next normalized the rewrite URL to `localhost` while its internal origin used `127.0.0.1`, so it treated the rewrite as external and re-entered the redirecting route. The initial diagnosis of an existing project blocker was incorrect.
- Repeating the test with the normal server binding (`pnpm exec next start --port 3102`) returned 200 for listing, vehicle detail and comparison. A fresh port was necessary to avoid browser-cached 308 redirects from the initial test. Browser checks confirmed all three pages render, adding a vehicle to comparison survives navigation, and English listing/detail/comparison URLs redirect to their German canonical URLs and finish at 200.
- A separate `fix/localized-route-redirects` branch was opened from `master` to investigate, but **no application fix or commit was necessary**. Returned to `backend/domain-foundation`; no routing source was changed.
- Authenticated ordinary-staff/master-admin screen checks were not performed by the assistant; no credentials were requested or accounts created. The temporary servers were stopped; no merge/deployment was performed. **Only private-account smoke checks and user acceptance remain pending.**
- **Acceptance — 2026-11-17:** the user confirmed both private-role checks passed and explicitly approved merging Section 01 and continuing. The assistant's automated/browser results and the user's private-role verification together satisfy the retest gate. Merge execution is recorded by Git history; no deployment is authorized by this acceptance.

### 02. Vehicle database, reference data and query layer

**Branch:** `backend/vehicle-inventory`.

**Evidence:** [public vehicle contract](../src/types/vehicle.ts), [admin contracts](../src/types/admin.ts), [vehicle form schema](<../src/app/(protected)/admin/vehicles/_schemas/vehicle-form.schema.ts>), [demo vehicles](../src/data/vehicles.ts), [current Prisma schema](../prisma/schema.prisma).

**Commit 1: `feat: add inventory schema and development migration`**

- [x] **02.01** Add a durable `Vehicle` model with stable ID, unique slug, stock number, make, model, variant, description, dealer relationship, location, exterior color, and condition (`used`, `demonstrator`, `annual`). Define the minimal dealer identity/relation required by this model; Section 08 extends/reuses it for business settings instead of adding a competing dealer source. _Prisma models added; migration and initial database round trips subsequently verified on the isolated child in 02.07. Real query/UI integration remains later points._
- [x] **02.02** Persist price with exact money semantics and private margin estimate separately; never use formatted currency strings as stored money or expose the margin publicly. _Added separate nullable `Decimal(12, 2)` source fields for EUR price and private margin. Migration and database round-trip tests remain 02.07/02.13; serialization/server input mapping remains 02.11/04._
- [x] **02.03** Persist first registration, mileage, power kW, owner count, partial VIN, fuel type, transmission, body type, optional consumption, and optional CO2 emission. Define units and whether PS is derived from kW rather than independently editable inconsistent data. _Source fields/enums added with explicit units and nullable incomplete-draft values. No independent PS column. Database checks/migration/round-trip verification remain 02.05/02.07/02.13; UI/query mapping remains 02.11/04._
- [x] **02.04** Persist equipment/features, display labels, status, inspection state, featured/availability decisions, acquisition date, publication timestamp, reservation expiry if used, sold timestamp, and creation/update timestamps. _Source fields, actor relations, version and minimal vehicle-change history added. Availability remains derived. Schema/type checks do not replace the 02.07 migration or transactional persistence tests._
- [x] **02.05** Add appropriate enums/constraints and indexes for actual queries: unique identifiers, public eligibility, updated-date ordering, status filtering, and dealer relationships. Do not make six-character VIN fragments globally unique unless explicitly justified. _Indexes and additive migration SQL authored, including CHECK constraints Prisma cannot express. Generated offline against the unchanged auth baseline; subsequently applied and checked on the isolated child in 02.07, not dev or Production._
- [x] **02.06** Decide which makes/models/options need reference tables and which can remain validated values. Do not create a taxonomy management system just because sample data has arrays. _Approved 2026-11-17: validated make/model text and existing option enums; no new reference tables or taxonomy UI._
- [x] **02.07** Create and test the Prisma migration against development/test Neon, preserving all existing auth tables. Define media and inquiry relationship deletion rules before dependent migrations are finalized. _Applied and repeat-deployed on verified child `br-billowing-field-b9ay9qjo`; schema diff empty; auth fingerprints preserved. All three isolated database tests passed. No migration applied to the dev parent or Production._

#### Implementation 02.01: vehicle identity and dealership relation

- On 2026-11-17 the user approved saving incomplete drafts with only dealership, stock number, slug, make and model required. Descriptive/technical/pricing values can remain incomplete until publication; missing values must not be replaced with fake placeholders. Full publication validation is implemented with the real server mutations in Section 04.
- `Vehicle` uses a server-generated CUID, unique slug/stock number, required make/model and a required `Dealer` foreign key. Variant, description, location, exterior color and the `used`/`demonstrator`/`annual` condition enum are nullable for unfinished drafts.
- `Dealer` initially stores only stable identity and name. Section 08 extends this same record with business settings. This relationship does not introduce marketplace/tenant permissions; the approved application scope remains one dealership.
- Deleting the dealership is restricted while vehicles reference it. No vehicle cascade is introduced. Stock normalization, first-publication slug locking, draft-only deletion, publication completeness and additional database constraints remain the explicitly numbered later points.
- This point changes the source schema, not a live database. No migration, seed, connection-string change or inventory UI wiring is performed here. Existing auth models are unchanged.
- Verification: `prisma format`, `prisma validate`, `prisma generate`, `pnpm typecheck` and Git whitespace checks passed. The schema diff contains only the new enum/models and formatter removal of a leading blank line; auth definitions are unchanged. Database durability/foreign-key/uniqueness behavior will be tested after the 02.07 migration, not claimed from schema validation alone.

#### Implementation 02.02: exact EUR storage

- `Vehicle.price` and `Vehicle.marginEstimate` are distinct nullable Prisma `Decimal` fields with PostgreSQL `numeric(12,2)` semantics: up to ten integer digits and two fractional digits. There is no zero default; an unfinished draft with no price/margin must remain distinguishable from a genuine zero.
- The approved currency is EUR only, not a configurable multicurrency feature. The server mutation must reject invalid precision/ranges before the database can round input, and construct Decimal from a canonical decimal string rather than use floating-point arithmetic.
- Keep Decimal values through server-side money calculations. Section 02.11 defines safe client serialization/display mapping and 04 maps the actual form input. Never persist localized display strings such as `25.000,00 €`.
- Margin stays staff-only through explicit public query projections and the existing public allowlist. Neither adding the column nor schema validation alone establishes a tested live public-data boundary.
- These fields are source schema changes only; constraints, migration and real database round-trip tests remain 02.05/02.07/02.13.
- Verification: Prisma formatting/validation/client generation, TypeScript typecheck, checklist formatting and whitespace checks passed. Auth definitions remain unchanged; no database connection/migration was used for these checks.

#### Implementation 02.03: technical fields and units

- On 2026-11-17 the user approved year/month first registration (`YYYY-MM`), whole kilometres, whole owner counts, authoritative kW with derived rounded metric PS, and explicit fuel-aware consumption units. CO2 is measured in g/km.
- Registration is a nullable seven-character string, not an invented first-of-month timestamp. Mileage/owner count/CO2 use integers; kW uses `Decimal(7,2)` so fractional power is not silently discarded. PS is derived at the read/display boundary, never stored or independently editable.
- Fuel, transmission and body types use enums matching current form choices. The six-character VIN fragment is nullable, staff-only and not globally unique.
- Consumption uses `Decimal(6,2)` plus an explicit `l_per_100_km` or `kwh_per_100_km` enum. No unit is inferred/defaulted for stored numbers. Missing values remain null; real zero consumption/emissions is not the same as unknown.
- Validation/constraints must keep value and unit paired, use L/100 km for petrol/diesel and kWh/100 km for electric, and preserve the declared unit for hybrid. A hybrid's single existing consumption metric is not a claim that both fuel and electric consumption are recorded.
- Section 02.05 adds numeric/date/pairing constraints; 02.11 and Section 04 must propagate units into typed read/form contracts before rendering these database values. The existing fixture/UI is not relabelled by this schema-only point.
- Verification: Prisma formatting, schema validation/client generation, TypeScript typecheck, checklist formatting and whitespace checks passed. These checks do not claim database constraint enforcement or a completed migration.

#### Implementation 02.04: lifecycle, business dates and traceability

- Features/labels are ordered string arrays, defaulting to empty for drafts. Status defaults to `draft`, inspection to `pending`, and Featured to false. Availability has no independent column; queries derive it from eligible Published stock under Section 01.
- Acquisition is a date-only value. The create action supplies today's `Europe/Vienna` date when omitted and permits staff correction. There is deliberately no database `now()` acquisition default using an unknown database timezone.
- Publication, reservation, sale, creation/update and change-history timestamps use timezone-aware instants (`timestamptz(3)`). Publication/reservation/sale remain nullable; no automatic reservation expiry/republication is introduced.
- Vehicles carry server-owned creator/updater user references and a version starting at 1 for the agreed optimistic concurrency contract. Reverse relations added to the Prisma `User` model do not add/alter existing auth database columns.
- Minimal `VehicleChange` rows carry vehicle, actor, instant, committed version and previous/current lifecycle, inspection and sale timestamp. One history entry per vehicle/version avoids ambiguous duplicate history. There is no generic event bus or customer payload.
- Foreign keys restrict accidental removal of referenced actors/history. A future hard-delete command must explicitly handle history for an eligible never-published draft in the same transaction; history must not be silently cascaded away for previously published inventory. Media/inquiry reference deletion policies are decided before migration in 02.07.
- Section 04 owns actual server actor assignment, first-publication immutability, sale/reopening timestamps, atomic history writes/version increments and delete authorization. Adding these columns does not itself enforce those mutation rules.
- Verification: Prisma formatting/schema validation/client generation, TypeScript typecheck, checklist formatting and whitespace checks passed. No live database or auth table was modified.

#### Implementation 02.05: constraints and indexes

- Added bounded-query indexes for updated-descending ordering with ID tie-break, status plus updated ordering, public status/inspection/featured eligibility, dealership and actor references. Existing unique slug/stock indexes cover archived as well as current vehicles; partial VIN is deliberately not unique.
- Generated `20261117180000_vehicle_inventory/migration.sql` offline using Prisma schema-to-schema diff from merged auth baseline `a74b574`. The migration creates only inventory enums/tables/indexes and foreign keys referencing existing users; it does not alter/drop existing auth tables. Migration execution remains 02.07, not part of this source-only point.
- Custom CHECK constraints enforce nonempty identity, uppercase/trimmed stock number, positive price/kW, nonnegative margin/mileage/owner count/consumption/CO2, finite numeric values, month-format registration, six-character alphanumeric VIN fragments, value/unit pairing and fuel-compatible units.
- Additional CHECK constraints reject inspection-ineligible public stock, invalid featured placement, missing first-publication time for public statuses, inconsistent sale timestamps, invalid versions and null arrays/elements. All inventory DDL is wrapped in one transaction.
- Prisma does not model these CHECK constraints; retain/review the custom SQL on future migrations. Database checks reject invalid state rather than silently normalizing it. Actual normalization and atomic lifecycle effects remain the Section 04 server command's responsibility.
- Time-relative rules (future reservation when set, realistic nonfuture first registration), publication completeness, old/new transition legality, slug immutability and draft-only deletion require stateful server validation. Do not claim CHECK constraints enforce them.
- Verification: Prisma validation/client generation, TypeScript typecheck, checklist formatting and whitespace checks passed. Static migration review confirmed transaction wrapping and inventory-only ALTER statements, with no DROP/TRUNCATE/data writes. SQL execution/constraint rejection tests remain pending 02.07 on a confirmed isolated target; this is not a claim that the unapplied migration has passed database tests.

#### Approved decision 02.06: reference-data scope

- The user approved validated text for make/model and the existing fuel/transmission/body/condition/consumption-unit enums. The source schema already implements that shape; no additional reference tables or migration changes are required.
- Trim/validate make/model on the server and reject blank values; database checks already reject blank identity text. Do not force names into uppercase or strip meaningful accents. German case/accent-insensitive search remains the separate 02.09 contract.
- Features and labels remain vehicle-owned string arrays, not global taxonomy tables. Existing selection suggestions may remain UI conveniences, not proof that arbitrary raw form values are trusted.
- No manufacturer/model CRUD, reference-data synchronization, external catalog provider or taxonomy management interface is introduced. If later requested, design it explicitly without breaking existing inventory.
- Verification: explicit user approval; checked that current source fields are `make String`, `model String`, the agreed option enums and string arrays, with no make/model reference tables. Documentation-only decision; no extra application or database validation run is needed.

#### Implementation 02.07: isolated migration verification

- The user approved preserving inquiries (block hard delete while referenced; Archive instead), deleting attachment links rather than shared media/files, and creating an isolated child of the supplied development branch for tests.
- Verified project `twilight-bread-36837209`, development branch `dev` (`br-plain-surf-b9e05n7g`), non-default/unprotected. Created and verified child `test-section02-inventory-20261117` (`br-billowing-field-b9ay9qjo`), endpoint `ep-lucky-silence-b9323aux.c-7.eu-central-1.aws.neon.tech`. No writes to the parent or Production are authorized.
- Neon rejected a custom suspend-timeout parameter on this account; confirmed no partial branch existed and retried without that parameter. The child uses the account's default suspension policy and 0.25 CU.
- Added an isolated migration test harness: explicit direct URL/expected-host guards, refusal to use the configured application database, additive/repeat deployment plus schema-drift checks, auth data/schema fingerprints, rollback-only synthetic data, exact-money/draft round trips, unique identifiers and SQL constraint rejection cases.
- **Initial safety stop (resolved):** the normal local direct URL did not match the verified dev parent, so credential reuse was refused before connecting. A separate private test configuration was supplied by the user; the normal application env was not repointed.
- To continue, privately create ignored `.env.inventory-test.local` with `INVENTORY_TEST_DATABASE_URL` set to the **direct** Connect URL for the isolated child/database `kuraishi-car-dealer-db`, and `INVENTORY_TEST_EXPECTED_HOST=ep-lucky-silence-b9323aux.c-7.eu-central-1.aws.neon.tech`. Never paste connection strings/credentials into chat or commit this file.
- `pnpm test:inventory-db` applies pending migrations **to the explicitly configured isolated target**, checks repeatability/drift, then runs rollback-only tests; it is not a read-only test command. Guarded configuration must be retained for later runs, never substituted with dev/Production.
- On 2026-11-17 the user privately saved the isolated child's direct connection URL. Boolean-only checks confirmed nonempty credentials, correct direct child host/database and expected-host guard without printing secrets. The previous missing/empty-file blocker is resolved.
- The migration applied successfully. Repeat deployment was a no-op, Prisma's live-schema diff was empty, and fingerprints of all five existing auth tables' rows/column definitions remained unchanged.
- Initial execution exposed a test-harness mismatch: this pinned Neon adapter reports raw SQLSTATE at `meta.driverAdapterError.cause.originalCode`, not `meta.code`. Verified the actual shape using a read-only invalid-cast diagnostic on the child, added typed guards and preserved exact SQLSTATE assertions. The rollback helper now surfaces unexpected failures instead of masking them.
- All three database cases passed: nullable drafts/exact money/technical-unit round trips; malformed values/contradictory publication/broken-reference rejection; unique stock/slug with deliberately reusable VIN fragments. Synthetic rows are transaction-rolled back and vehicle absence is checked afterward.
- The retained child is reserved for continued testing; do not delete/reset it or treat it as the normal application target without explicit agreement. Dev parent and Production were not migration/test targets. Query authorization/projections, full fixture import and broader integration cases remain 02.08-02.13; this is not a claim that the live inventory UI is database-backed.
- Final verification: `pnpm test:inventory-db` passed all **3 database tests** with auth preservation checked again after rollback-only test cleanup; `pnpm test` passed all **46 unit tests**; full typecheck, repository lint, changed-file Prettier and whitespace checks passed. Private configuration remains Git-ignored and no credentials were committed or printed.

**Commit 2: `feat: add staff and public inventory queries`**

- [x] **02.08** Add staff list/detail queries and public list/detail/featured/related queries with explicit projections. Validate ID/slug lookups, stable ordering, counts, result limits, and invalid input handling. _Implemented server-only queries in `src/lib/inventory-queries.ts`, with isolated-database tests of the real query functions. Production session lookup is replaced only in the test harness; cookie/session endpoint integration is not newly proven._
- [x] **02.09** Preserve the existing German keyword search semantics or document an approved change: multiple terms, labels/features, registration/location, case/accent normalization, and featured-first results. Verify the database implementation with examples from existing filter tests. _Implemented optional `search` on the public inventory list, verified against the existing filter helper using real isolated database queries; see the implementation record below._
- [x] **02.10** Define a public eligibility predicate reused across all public consumers; an undiscoverable draft must also be inaccessible by guessed slug, comparison ID, metadata generation, and inquiry lookup. _Canonical surface rules now drive pure visibility, Prisma predicates, raw search and server-only public lookup queries. Integration into the still-fixture-backed pages/actions remains in their respective sections._
- [x] **02.11** Return serializable, typed values to Client Components; consistently map database money, dates, nullable metrics, and media references rather than casting rows into existing frontend types. _All inventory query exports now return explicit plain-data DTO contracts. Money/date/null conversions are verified against real isolated database rows; media fields remain deliberately absent until Section 03 provides persisted references._

#### Implementation 02.08: staff and public inventory reads

- [Server-only query module](../src/lib/inventory-queries.ts) reuses the shared Prisma client. `listStaffVehicles()` and `getStaffVehicle()` each call `requireSession()` themselves, allowing ordinary staff and admin while denying anonymous access.
- Public list/detail/featured/related queries use explicit database projections and SQL eligibility before pagination/counting. Raw inspection workflow, stock number, margin, partial VIN, internal dates/actors/history and version do not appear in public results; availability, featured placement and inspection badge flags are derived.
- Staff lists default to 8 rows, optionally filter by validated status and order updated-descending with ID tie-break. Public lists default to 8, order Featured first then updated-descending/ID, and include only Published/Reserved inspection-passed stock. Rows/counts run in a Repeatable Read transaction for a matching snapshot; beyond-last pages return empty items with unchanged totals, not silently clamped pages.
- Direct public slugs retain Sold detail but hide Draft/Archived. Slug validation accepts Unicode letters/numbers to preserve existing German fixture URLs and rejects malformed path/query input. Valid missing/hidden lookups return null; invalid inputs throw Zod errors; database failures propagate rather than becoming fixture data or apparent success.
- Featured defaults to 8 with a maximum of 100. Related preserves the existing same-body-type rule and default maximum of 3, excludes the source, and recommends only Published/Passed vehicles. Callers may explicitly request another validated limit up to 100. A missing/private source returns null; a visible source with unknown body type has no matching recommendations, not an unrelated fallback.
- These are server-side database read records, not casts into legacy frontend types. Decimal/date conversion and complete client DTO contracts remain 02.11; keyword search remains 02.09. No images/media references are invented before Section 03, and the current fixture-backed pages are not rewired by this point.
- [Database query tests](../prisma/inventory-queries.test.ts) exercise the actual exported query functions with real isolated Prisma queries. Only database-client binding and session retrieval are replaced via Node's test-only module mocks; the session mock calls the existing real authorization assertion. A test-only Prisma extension injects a query failure to verify propagation.
- Extracted the existing explicit-host/private-config guard into [shared isolated-test setup](../prisma/inventory-test-client.ts), reused by migration/query tests. `pnpm test:inventory-db` now runs both suites with React-server export conditions and Node's experimental module-mocking flag; this adds no dependencies or production abstraction.
- Query fixtures are created only after confirming the isolated child has no existing vehicles. Cleanup deletes only exact synthetic IDs, then confirms those vehicles are gone. Normal application/private configuration, dev parent and Production are not changed.
- Verification: all **9 isolated database tests** (3 migration + 6 query) and **46 unit tests** passed; standalone typecheck, repository lint and Production compilation/type validation/static generation passed. Changed-file formatting/whitespace checks passed. Node emits its expected experimental module-mocking warning only in the database test runner. The build regenerated the route-types import in `next-env.d.ts`; that generated-only change was restored to its clean pre-build state and excluded from this point.

#### Implementation 02.09: database-backed German keyword search

- `listPublicVehicles({ search, page, pageSize })` now accepts an optional string search. Omitted/blank/whitespace-only searches preserve the existing list behavior; malformed non-string filters throw Zod errors rather than silently becoming an unfiltered request.
- Extracted query-term normalization from [the existing filter helper](../src/lib/vehicle-filters.ts), preserving German lowercase, NFD decomposition, removal of U+0300-U+036F combining marks, whitespace splitting and AND matching of all terms. PostgreSQL applies equivalent document normalization with its built-in German ICU collation and Unicode functions; no extension, migration, search provider or dependency was added.
- Search uses the same public fields: make/model/variant, raw category values and German body/fuel/transmission labels, exterior color, location, registration, equipment and labels. SQL labels are generated from the existing formatters and generated Prisma enum values, not a separately maintained translation list. Unknown nullable categories contribute no invented label.
- Parameterized SQL performs literal substring matching before `LIMIT`/`OFFSET` and before counting. Percent/underscore/backslash/quotes are literal input, not wildcard or SQL syntax; accents are normalized but `ss`/`ue` transliteration and stemming are not introduced. Internal IDs, slugs, stock numbers, VIN fragments, prices, margins and descriptions do not become searchable.
- Only Published/Reserved inspection-passed stock is searched. Nonblank requests obtain bounded matching IDs, the matching count, and explicitly projected rows in one Repeatable Read transaction; they never fetch the entire inventory into application memory to filter it. Results retain Featured first, updated-descending and ID tie-breaking. Empty/beyond-last pages retain the correct matching total. Blank searches retain the original two-query path.
- [Isolated query tests](../prisma/inventory-queries.test.ts) compare real database results with `filterVehicles()` for 29 search examples over the existing 24 demo vehicles, including the original German tests, all translated categories, registration, features/labels, composed/decomposed accents, uppercase sharp S, literal punctuation, SQL-looking input and nonmatches. They also cover full multi-page traversal, beyond-last totals, whitespace-only input, null technical fields, hidden/Sold exclusions, private-field non-searchability, malformed search filters and raw-query failure propagation. All temporary import IDs are scoped to this test and removed; this is not the repeatable development seed planned in 02.12.
- Verification: **10 isolated database tests** (3 migration + 7 query), **46 unit tests**, standalone typecheck, repository lint and changed-file formatting/whitespace checks passed. Only the previously approved isolated child was used; normal app configuration, dev parent and Production were unchanged. Public pages remain fixture-backed until Section 05; staff UI search integration remains Section 04.

#### Implementation 02.10: shared eligibility and public consumer boundaries

- [Canonical policy rules](../src/lib/inventory-policy.ts) now express all seven approved surfaces once. The existing pure visibility/projection helpers retain their behavior and use those rules; [server-only predicate builders](../src/lib/inventory-eligibility.ts) produce Prisma filters and parameterized SQL from the same rules rather than duplicating lifecycle/inspection conditions.
- Every existing database-backed public read now uses those predicates: catalog rows/counts, raw German search, direct detail slug, Featured, Related source and Related candidates. Derived public Featured flags also use the canonical visibility helper.
- Added `getPublicComparisonVehicle(id)`: validates an opaque ID and returns only eligible Published/Reserved inspection-passed stock through the existing public allowlist. Sold, Draft, Archived and valid missing IDs return null; this is a single-record lookup, not a change to comparison ordering or its three-car UI limit.
- Added `getPublicVehicleMetadata(slug)` with a minimal explicit projection for future metadata generation. It uses Detail eligibility, retaining Sold URLs but denying Draft/Archived. No route generation or page metadata has been rewired in this point.
- Added `listPublicVehicleSitemapEntries({ page, pageSize })`: explicit ID/slug/actual-updated-time projection, stable ID ordering, default 8/max 100, matching count/page metadata and Repeatable Read snapshot. It includes eligible Sold entries and excludes hidden stock. This is a paginated read, not a complete sitemap; the Section 15 consumer must iterate all pages.
- Added `getPublicVehicleForInquiry(slug)` to match the existing contact-link slug convention. It returns a minimal public reference and `standard` or `informational` inquiry type; Reserved is informational, while Sold/private/missing records return null. Internal inspection/Featured fields used to derive this result are removed. This is a read boundary, not inquiry submission or booking; Section 09 must revalidate eligibility when persisting a submission.
- Existing strict ID/slug/pagination validation and error propagation apply to the new queries. Records still contain server-side Decimal/Date values where selected; typed client serialization remains 02.11. No images, route changes, client integration, mutations, schema migrations or dependency changes were introduced.
- [Isolated integration tests](../prisma/inventory-queries.test.ts) compare real Prisma predicates with policy visibility on stored lifecycle examples, and raw SQL with all 40 status/inspection/Featured combinations across all seven surfaces. Invalid hypothetical publication states are read-only SQL `VALUES` rows, not constraint-bypassing database inserts. Real exported queries are exercised for guessed IDs/slugs, Sold/Reserved distinctions, private-field exclusion, sitemap pagination/timestamps, malformed/not-found inputs and database error propagation.
- Verification: **12 isolated database tests** (3 migration + 9 query), **46 unit tests**, standalone typecheck, repository lint and changed-file formatting/whitespace checks passed. Only the approved isolated child was targeted; ordinary application configuration, dev parent and Production are unchanged.
- Delivery workflow clarification: after the eventual approved Section 02 merge into `master`, provide the full guided section test checklist and wait for the user's confirmation before Section 03. The pre-merge report/review gate still applies; no merge or next-section start is authorized by completing this point.

#### Implementation 02.11: typed, client-safe inventory DTOs

- Added [client-importable DTO contracts](../src/types/inventory.ts) for staff/public inventory, metadata, inquiry references, sitemap entries and paginated responses. They use type-only generated enums, not Prisma runtime objects, and deliberately do not extend/cast into the older fixture `Vehicle`/`AdminVehicle` types that require complete numeric values and images.
- Added [server-only explicit adapters](../src/lib/inventory-dto.ts), colocating the existing staff/public Prisma projections with their mapping. Every exported inventory query now declares its DTO return type and serializes before returning, including both catalog/search paths, staff list/detail, public detail/comparison, Featured/Related, metadata and sitemap.
- Price and staff-only margin are exact EUR decimal strings with exactly two fractional digits, or null when unset. No localized currency text or binary floating-point money is introduced; future money calculations still belong on the server with Decimal. UI display formatting/null handling is part of the later page/form integrations, not an unsafe conversion into the legacy numeric model.
- Nullable technical fields remain null rather than fabricated zero/empty values. kW and consumption become finite display numbers within their constrained database ranges; consumption retains its explicit unit. Rounded metric PS is derived from authoritative fractional kW using **1 PS = 0.73549875 kW**. This read contract uses the standard conversion rather than the demo fixtures' approximate 1.36 multiplier; existing fixture data/UI were not rewritten.
- Absolute timestamps become UTC ISO-8601 strings with millisecond precision. Acquisition DATE remains a `YYYY-MM-DD` calendar value, and first registration remains `YYYY-MM`. Null publication/reservation/sale times remain null. Sitemap entries keep actual update instants, now as strings rather than Date objects.
- Public adapters explicitly allowlist fields even when given a full staff row, derive availability/Featured/inspection flags, and reject accidentally supplied private/ineligible inventory instead of serializing it. Staff-only stock/margin/VIN/workflow/actor/version data remain unavailable in public DTOs. Inquiry contracts narrow lifecycle and inquiry type without exposing their internal inspection fields.
- Media references are intentionally **omitted**, not faked as image URLs, default photos or an empty relationship claimed to have been loaded. The current schema has no media/attachment model. Section 03 must extend these contracts with typed persisted references and ordering once that source exists; current DTOs cannot be cast directly into image-requiring legacy components.
- Added a focused real-database serialization case covering the maximum `Decimal(12,2)` price (`9999999999.99`), exact zero margin versus null, fractional kW/rounded PS, zero and missing metrics, explicit consumption units, registration/calendar dates, DST-adjacent timestamp instants and null timestamps. Results from every query boundary must survive a JSON stringify/parse round-trip without structural/value changes, detecting leaked Date/Decimal instances or undefined properties. Full-row public mapping/private rejection is also exercised.
- Verification: **13 isolated database tests** (3 migration + 10 query), **46 unit tests**, standalone typecheck, repository lint and changed-file formatting/whitespace checks passed. The database suite ran with process-local `TZ=America/Los_Angeles` to exercise date-only/instant output independently of the dealership timezone. Synthetic rows were removed; normal private configuration, dev parent and Production were unchanged. No schema/dependency change, deployment or page integration was introduced.

**Commit 3: `test: verify inventory persistence and fixture import`**

- [x] **02.12** Prepare a development-only fixture import/seed with stable relationships and repeatable behavior. Demo content must not silently become Production inventory; obtain approval and a real-data import plan separately. _Opt-in preview/apply CLI and transactional create-only importer implemented and exercised on the approved isolated child. The user approved test-only execution, Draft/Pending/not-Featured defaults, edit preservation and conflict rejection; all imported test rows were removed._
- [x] **02.13** Test duplicate identifiers, optional fields, numeric/date boundaries, malformed queries, eligible/ineligible records, deterministic pagination, and private-field exclusion using an isolated database branch. _Completed the focused coverage review and expanded the existing migration/query suites: 17 isolated database tests and 46 unit tests pass. Full-section results, limitations and the user retest/merge gates follow below._

#### Implementation 02.12: controlled development fixture import

- On 2026-11-17 the user approved **implementation/testing only with cleanup**, **Draft + Pending inspection + not Featured** for initial imports, and **create missing / preserve edits / reject identifier conflicts** on repeat runs. No permanent seed of normal development or Production inventory is approved.
- Added [transactional fixture import](../prisma/inventory-fixtures.ts) and an explicit [CLI entry point](../prisma/seed-inventory.ts), exposed through `pnpm inventory:fixtures`. There is no postinstall/build/migration hook or automatic Prisma seed registration. Omitting `--apply` performs a read-only preview and prints counts, not connection strings, user details or vehicle payloads.
- The command reuses the existing ignored isolated-target configuration and expected-host/direct-connection guards, including refusal of configured application hosts. The shared setup now also refuses `NODE_ENV=production` and any Vercel execution hints. These guards supplement, not replace, control-plane verification and approval of the chosen non-production endpoint; they do not infer a remote branch's purpose from its hostname.
- Every call requires an explicit existing unbanned actor ID, existing dealership ID and valid `YYYY-MM-DD` acquisition date. The importer does not create/change staff accounts, roles, passwords, sessions or dealership/contact records. Its writes are limited to missing fixture vehicles and their initial history.
- The current 24 source fixtures receive stable namespaced IDs, `DEV-FIXTURE-...` stock numbers, namespaced slugs and version-1 creation-history markers tied to the actual supplied actor. All start Draft/Pending/not Featured with no invented publication/reservation/sale dates. Money/kW are constructed as Decimal from canonical source strings; PS remains derived by the read adapter.
- Descriptive/technical source values with known meaning are copied. The legacy fixture's consumption number has no declared unit, so both consumption and unit remain null rather than inferring a hybrid/fuel measurement. Unknown owner count, partial VIN and private margin also remain null. External demo images and placeholder dealer contact/rating data are not imported.
- Preflight verifies owned fixture IDs against their initial history, creator and dealership, and rejects ID/stock/slug/history namespace conflicts. Existing imported records are never updated or deleted: local price/stock/slug edits, versions, timestamps, workflow state and later history remain intact. Missing fixtures alone are created. Vehicle and initial history inserts run in one Serializable transaction; failures roll back without silent duplicate skipping or automatic decision retries.
- Preview syntax, for a separately verified/approved isolated target with existing actor/dealer records:

  ```powershell
  pnpm inventory:fixtures --actor-id "<existing-staff-id>" --dealer-id "<existing-dealer-id>" --acquired-on "YYYY-MM-DD"
  ```

  `--apply` is the explicit write opt-in, not part of this preview. **Do not leave a persistent seed in the current test child:** the remaining integration suite requires it empty. Any future persistent development seed needs a separately approved target and actor/dealership setup; Production requires its own real-data import plan, not demo data.

- [Integration tests](../prisma/inventory-queries.test.ts) run the actual CLI for preview, first apply, unchanged reapply and partial missing-row import. They verify all 24 initial states/relations/history, public invisibility, actor/dealer preservation, and exact preservation of edited records plus later version/history. Negative cases exercise production/Vercel refusal, missing actor/dealer, invalid calendar date, unrelated ID/stock/slug conflicts and rollback when a test-only history-write failure occurs after actual vehicle insertion.
- Cleanup is restricted to known fixture/test IDs owned by the synthetic test actor and dealership, with history removed before its vehicle. The suite confirms all imported/conflict rows are gone; no permanent development seed remains. Verification: **15 isolated database tests** (3 migration + 12 query), **46 unit tests**, standalone typecheck, repository lint and changed-file formatting/whitespace checks passed. Private configuration, normal dev parent and Production were unchanged; no schema/dependency change or deployment was introduced.

#### Implementation 02.13: final persistence and query coverage

- Reviewed existing migration/query/policy tests against every 02.13 requirement rather than duplicating their assertions. Added two focused cases in the existing database test files and extended related cases; no runtime query/schema/dependency changes were needed.
- Persistence now verifies exact minimum positive price/kW, zero margin/consumption/integer metrics, maximum Decimal/integer storage values, a valid leap-day acquisition date and nullable lifecycle instants. Rejection cases cover numeric overflow, zero price/power, negative optional metrics, invalid leap day/instant, invalid month, unmatched consumption units and unknown consumption fuel. These are storage boundaries, not claims that unrealistic owner counts or future registrations will pass the later business form.
- Identifier collision tests now collide with an Archived vehicle, proving its stock number/slug remain reserved while VIN fragments may repeat.
- Query tests now verify newer non-Featured stock does not outrank Featured stock, staff ordering follows update time, and search/non-search pages preserve identical deterministic ordering. All four paginated read paths accept page size 100 and offset 2,147,483,647; the next offset, unsafe/nonfinite/fractional/string inputs, invalid sizes and unknown filters fail validation before database access.
- Expanded failure injection to every exported inventory query, including both catalog paths and authenticated reads, to prove errors propagate instead of returning demo/empty success data. Existing tests retain optional-field/zero/null handling, all seven public-surface rules, German literal search, privacy projections, exact DTO output, repeatable import and transactional history-failure rollback.
- Final database run used process-local `TZ=America/Los_Angeles` and the explicitly rechecked approved child/database. **17/17 database tests** (4 migration + 13 query) and **46/46 unit tests** passed, none skipped. Typecheck, repository lint, Production build (46 static pages), changed-file formatting and whitespace checks passed. Build-only route-type regeneration was restored to its clean pre-build state; private configuration remains ignored. Temporary test data was cleaned up; normal dev/Production were not test or migration targets.

#### Section 02 completion report - 2026-11-17

**Engineering status:** **02.01-02.13 complete** on `backend/vehicle-inventory`; ready for user pre-merge review/retesting. This is completion of the database/query foundation, **not** release acceptance, a merge, a deployment or a claim that the website is dynamic.

| Delivered area                                | Evidence and verified outcome                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity, money, technical fields and history | [Schema](../prisma/schema.prisma), [additive migration](../prisma/migrations/20261117180000_vehicle_inventory/migration.sql), [migration tests](../prisma/inventory-migration.test.ts): nullable drafts, exact EUR Decimals, explicit units, date/instant types, restrictive references, unique identifiers including Archived stock, constraints and storage boundaries. |
| Migration repeatability                       | Isolated deploy, repeat deploy and empty live-schema diff pass; preserved auth row/column fingerprints remain unchanged around migration/rollback tests. Custom CHECK SQL remains authoritative where Prisma cannot model it.                                                                                                                                             |
| Staff/public reads                            | [Queries](../src/lib/inventory-queries.ts), [integration tests](../prisma/inventory-queries.test.ts): per-query staff session assertion, explicit public projections, bounded snapshot-consistent lists/counts, stable ordering and validated lookups.                                                                                                                    |
| Search and public eligibility                 | [Eligibility predicates](../src/lib/inventory-eligibility.ts) derive from [shared policy](../src/lib/inventory-policy.ts). Real stored examples plus a read-only 40-combination SQL matrix cover seven public surfaces without disabling constraints. German search is compared with the existing filter for 29 examples.                                                 |
| Client-safe output                            | [DTO contracts](../src/types/inventory.ts), [adapters](../src/lib/inventory-dto.ts): exact money strings, UTC instant/date-only strings, nullable metrics, derived PS and private-field exclusion; actual query results survive JSON round-trip.                                                                                                                          |
| Controlled demo import                        | [Importer](../prisma/inventory-fixtures.ts), [CLI](../prisma/seed-inventory.ts): preview by default, explicit write opt-in, existing actor/dealer, stable initial history, create-only reruns, preserved edits, conflict refusal and atomic rollback. Test-only imports were removed.                                                                                     |

**Commit references**

- Schema/decisions: `9be448c`, `70863c3`, `382e2e2`, `b58223b`, `3e46496`, `863623d`.
- Isolated migration harness/verification: `cc145bb`, `3bde3be`.
- Staff/public reads: `b423da9`; German search: `1c4b3db`; shared eligibility: `f2028d8`; DTOs: `69cede2`; controlled fixtures: `dd6960f`.
- Final coverage/report: use `git log --oneline --grep="complete Section 02 verification"` to locate the 02.13 delivery commit containing this record.

**Known limits and release safety**

- Public/admin pages, forms, comparison, sitemap and metadata still consume their previous fixtures. There is no new inventory HTTP endpoint or live admin-to-database-to-public save flow. Persistence from the UI is Section 04; public integration is Sections 05-07/15. Images/references require Section 03.
- Query tests run actual Prisma/database logic, but replace session retrieval and the shared-client binding in the test process. They test the real authorization assertion, not live cookies, expired-session handling or the deployed Better Auth endpoints. Those live checks must not be reported as newly proven here.
- Stateful mutation rules remain Section 04: input precision before database rounding, realistic/time-relative values, publication completeness, legal transitions, immutable published slugs, optimistic conflict handling, version/history changes and authorized draft-only deletion. Schema columns/checks and the fixture import are not substitutes for those commands.
- Only `test-section02-inventory-20261117` (`br-billowing-field-b9ay9qjo`) was migrated/tested. Neither normal dev nor Production has received this migration through this work. Do not apply it there or seed demo stock merely because this branch is merged; use a separately reviewed migration/release procedure when authorized. Never replace custom constraints with `db push` or reset a target to make tests pass.
- No Production deployment, auth/provider reconfiguration, persistent demo seed, merge or new credentials were introduced. Existing Vercel configuration disables Git deployments; merging does not imply deployment.

#### Full Section 02 guided user retest

Use this guide **before merge**, then repeat it on merged `master` when notified. Post-merge confirmation is a separate required gate, not permission to start Section 03 immediately.

**A. Prerequisites and target checks**

1. Use a clean local working copy and the repository's existing pnpm/Node setup. Preserve unrelated edits; do not switch branches over them. Fetch/pull the latest `backend/vehicle-inventory` for pre-merge testing; use the approved merged `master` for post-merge testing. Reuse installed dependencies; only restore them with `pnpm install --frozen-lockfile` if missing.
2. Keep the existing private `.env.inventory-test.local` ignored and uncommitted. In the Neon Console, select project `twilight-bread-36837209`, then child `test-section02-inventory-20261117`, database `kuraishi-car-dealer-db`. Confirm its direct endpoint is `ep-lucky-silence-b9323aux.c-7.eu-central-1.aws.neon.tech`; the private URL and `INVENTORY_TEST_EXPECTED_HOST` must match that exact endpoint. Never paste connection strings/passwords into chat.
3. This child must have no existing vehicles. The suite refuses existing inventory rather than deleting it. **`pnpm test:inventory-db` is not read-only:** it deploys pending migrations to this guarded target and temporarily writes synthetic rows before rollback/cleanup. Do not run it against the dev parent, default/Production branch, Vercel or a production-mode process. Do not disable guards, reset/delete a branch or manually clear unfamiliar rows after a refusal.
4. Do not repoint normal application URLs at the child to run these tests: the harness deliberately refuses configured application hosts. For the optional browser smoke checks below, independently confirm the normal app is using an approved **non-production** environment; stop and agree that setup first if its target is unknown. No private accounts are needed for the automated database suite.

**B. Automated checks - run individually in PowerShell or Git Bash on Windows; stop on any failure**

```powershell
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm test:inventory-db
pnpm exec prettier --check 'prisma\inventory-migration.test.ts' 'prisma\inventory-queries.test.ts' 'Notes\Checklist.md'
git diff --check
git status --short
```

- Expected: **46 unit tests**, **17 database tests**, no failed/skipped tests, successful typecheck/lint/build and formatting/whitespace checks. The database runner's experimental module-mocking warning is expected.
- Keep Windows path arguments quoted as shown. Git Bash treats unquoted backslashes as escapes, turning `prisma\inventory-migration.test.ts` into `prismainventory-migration.test.ts`. Prettier's "No files matching the pattern" errors mean that check failed, even if its final line says all matched files use the correct style.
- To repeat the timezone-independence check, run the database command in a fresh PowerShell process with `$env:TZ='America/Los_Angeles'` set for that process only. The reported assistant run used that setting.
- The database suite checks deploy/redeploy/drift, auth preservation during migration, positive/negative boundaries, Archived identity conflicts, staff/public access, search/order/pagination, DTO privacy, error propagation, CLI repeatability and rollback. Successful teardown confirms its known vehicle/import rows are gone. In the selected child only, Vehicle/VehicleChange should again be empty.
- A build may regenerate the tracked route-types import in `next-env.d.ts`. Review that known generated-only difference against your pre-build copy; preserve unrelated edits and do not include build artifacts or private configuration in the merge. A failed cleanup/assertion is a failed retest, not permission to delete/reset data.
- Do **not** run a separate `inventory:fixtures --apply`: persistent seeding is not approved and would make the next database run correctly refuse the nonempty child.

**C. Manual regression smoke - only on the confirmed non-production app**

1. Start `pnpm serve`; open the displayed local origin. Verify `/`, `/fahrzeuge`, an existing vehicle detail reached from the listing, and `/fahrzeugvergleich` render without new errors. Search for `skoda` or `Automatik`, open a result and use the existing comparison controls. Expected: the same fixture-based UI/search/comparison behavior, not newly persisted database inventory.
2. Signed out, visit `/admin`, `/admin/vehicles`, `/admin/vehicles/new` and `/admin/accounts/new`. Expected: login redirect with the return path, no protected data displayed.
3. With an existing private ordinary-staff test account, check the dashboard and inventory/new/edit screens render; `/admin/accounts/new` must remain denied. With the existing master-admin test account, check access to the account-creation screen. Do not create real accounts, save cars or rely on simulated success toasts as database proof.
4. Stop your local server with Ctrl+C. Do not share credentials, auth-table contents or unredacted environment/error screenshots.

**D. Retest record and gates**

| Gate/check                                        | Assistant evidence for this milestone                                         | User record                                                                   |
| ------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Correct isolated target; no private files in diff | Rechecked target without displaying credentials; private file remains ignored | Pending: user confirmation                                                    |
| Database tests and cleanup                        | 17 passed, 0 skipped; scoped teardown passed                                  | Passed: user screenshot and assistant rerun, 17 passed / 0 failed / 0 skipped |
| Unit/typecheck/lint/build/format/whitespace       | All passed; 46 unit tests, 46 static pages                                    | Assistant rerun passed; user record pending                                   |
| Browser regression/private-role smoke             | Not rerun by assistant for 02.13; no UI behavior changed                      | Passed: user confirmation, 2026-11-18                                         |
| Pre-merge review/acceptance                       | Section 02 report and pre-merge retests completed                             | Approved by user; merged into `master` as `f4ab9b1` on 2026-11-18             |
| Post-merge `master` retest                        | Repeat this full guide on merged `master`                                     | Passed: user confirmed all post-merge checks, 2026-11-18                      |

If anything fails, report only the check name, expected/actual result and a redacted error; keep the section open for repair. After successful pre-merge retest and explicit approval, merge through the agreed process without assuming deployment. **After merge, notify the user to repeat this full guide on `master` and wait for confirmation. Only then begin Section 03 / 03.01 on its section branch.**

**Retest and merge follow-up - 2026-11-17/18:** the supplied terminal screenshot confirms 17 database tests passed. Its formatting command initially failed because unquoted Windows paths were pasted into Git Bash, not because of an inventory-code failure; the corrected quoted command above was verified in both Git Bash and PowerShell. On 2026-11-18 the assistant reran the approved-target check and all 17 isolated DB tests (0 failed/skipped), 46 unit tests, typecheck, lint, formatting, whitespace and Production build successfully. The shell's default Node was 14.21.3; validation used the already-installed Node 25.8.0 via a process-local PATH override, without changing the machine-wide Node selection. Build-generated `next-env.d.ts` route-types change was left untouched. The user confirmed the browser/private-role smoke passed and later explicitly approved merge. Section 02 was merged/pushed to `master` as `f4ab9b1` on 2026-11-18; no deployment or normal dev/Production migration occurred. The user subsequently confirmed all post-merge checks on `master` passed. Section 02's post-merge gate is complete; no Production deploy was requested.

**Done when:** a real vehicle can be stored and read through the correct staff/public query boundaries, migrations are reproducible, and no UI has to invent database fields.

### 03. Media uploads, library and vehicle image relationships

**Branch:** `backend/media-library`.

**Evidence:** [media library](<../src/app/(protected)/admin/media/_components/media-library.tsx>), [vehicle form Media tab](<../src/app/(protected)/admin/vehicles/_components/vehicle-form.tsx>), [media/admin types](../src/types/admin.ts), [Next image configuration](../next.config.ts).

**Current state:** upload, reorder, remove, copy URL, download, and delete controls are placeholders. The vehicle form schema has **no media field**, so simply connecting its existing submit handler will not save images.

**Commit 1: `feat: add media storage and upload authorization`**

- [x] **03.01** Confirm the storage provider before installing anything. Store binary files in object storage and metadata/references in Postgres; keep provider keys server-side with separate environments. _The user originally selected UploadThing in 01.06, then approved replacing it with Neon Object Storage: UploadThing Free serves files publicly by URL and reserves private ACL for paid plans. Use a private bucket for PDFs by default and a separate `public_read` bucket only for assets explicitly approved as public. Neon bucket access is immutable after creation, so the model and upload flow must keep bucket/access consistent. This decision changed no package, credential, bucket, or deployment._
- [x] **03.02** Model media ID, provider object key, safe URL/access policy, title, original filename, type (`image`, `document`, `brand`), alt text, size, verified MIME type, optional width/height, uploader, and upload timestamp. _Added the `MediaAsset` model with immutable bucket-access class/object key, metadata, uploader, and recorded public-approval actor/time. The storage URL is derived by the trusted storage layer rather than persisted. Database constraints validate keys, MIME type, size, dimensions, and public approval; a trigger rejects in-place changes to the object key, access class, or approval record. The additive Prisma migrations were applied and tested only on the isolated Section 03 child._
- [x] **03.03** Authorize uploads using a fresh staff session; enforce approved file types/count/size, safe filenames, verified file contents where appropriate, and completion verification before an upload becomes a usable asset. Set separate document/image handling and avoid serving arbitrary active content as trusted site files. _Implemented private-only staff upload-intent and completion endpoints. The server presigns size- and MIME-constrained browser form uploads to private staging, verifies object metadata and JPEG/PNG/PDF signatures, then copies the verified object to a private final key before inserting its metadata. Replaying a still-valid upload form can only overwrite its inaccessible staging key, not the verified final object. Five files per request and approved individual limits are enforced. The 20-image vehicle gallery cap is enforced through the ordered attachment positions added in 03.06; public promotion and file rendering remain separate controlled steps. Configure bucket CORS for the approved app origins before wiring the browser upload UI in 03.07. Integration tests and migration were run only against the isolated Section 03 child._
- [x] **03.04** Handle canceled, failed, partially completed, and orphaned uploads explicitly. Database and storage updates need a defined cleanup/retry path, not an assumption that they share a transaction. _Added atomic completion/cancellation transitions and an owner-authenticated cancellation endpoint. Completed intents remain until their signed upload window expires; expired cleanup removes replayed staging objects but preserves final objects referenced by media assets. Cancelled or incomplete intents clean both staging and partial final objects, then retain their state for retry until expiry. Cleanup is idempotent and bounded: up to five expired intents are swept during upload-intent creation, and admins can run a 100-intent sweep from the cleanup endpoint. Per-item storage failures are logged and surfaced in cleanup reports; the isolated media database/storage tests cover cancellation, replay cleanup, preservation of completed assets, expiry, retry, and terminal-state constraints. No Production database, bucket, or data was touched._
- [x] **03.05** Configure the trusted image host and rendering behavior; preserve responsive images, alt text, gallery compatibility, and appropriate public/private access for legal documents. _Added a branch-specific Next Image remote pattern restricted to the configured HTTPS Neon storage host and public bucket path. Public URL generation requires `public_read` access plus recorded approval; private assets (including legal files unless explicitly approved) return no public URL. Existing vehicle cards, gallery, and preview slider retain their responsive sizes and alt text. The isolated storage test verified anonymous retrieval from the configured public test bucket and removed its temporary object. No Production bucket, object, or data was changed._

**Commit 2: `feat: persist vehicle image attachments and ordering`**

- [x] **03.06** Add vehicle-media relationships with deterministic order and a clear cover-image rule. Decide whether an asset can be reused by several vehicles and represent that relationship accurately. _Added a vehicle-media join model with one-vehicle-per-photo uniqueness, unique per-vehicle positions restricted to 0–19 (enforcing the 20-image cap), and image-only attachment integrity. The lowest ordered position is the cover image; the user chose that photos cannot be shared across vehicles. Attached assets cannot be deleted or reclassified as non-images; vehicle removal cascades its links. Migration tests verify the ordering, cap, ownership cardinality, image type, and delete safeguards against the isolated Section 03 child. Production was not touched._
- [ ] **03.07** Wire vehicle form upload, existing-asset attachment, reorder, and remove controls into actual state plus server persistence. Decide how unsaved new vehicles hold temporary uploads until their vehicle ID exists.
- [ ] **03.08** Include ordered media IDs/attachments in validated create/update operations; verify ownership/access and reject missing/deleted/unfinished assets. Save changes atomically at the database layer.
- [ ] **03.09** Define minimum image requirements for publishing and the user-visible fallback for legacy records without valid media.

**Commit 3: `feat: connect media library queries and actions`**

- [ ] **03.10** Replace fixture loading with a staff query for search by title, filename, alt text, type/usage, and related vehicle. Preserve current type filters and usage filters (`vehicle`, `brand`, `legal`, `unused`); add bounded pagination for real datasets.
- [ ] **03.11** Compute "used by", unused status, uploaded date, file size, and dimensions from stored metadata/relationships rather than hard-coded fixture labels.
- [ ] **03.12** Implement single Copy URL and Download actions, and bulk Download with an agreed implementation (bounded archive generation or explicit individual downloads). Report clipboard/network/storage errors and do not claim a download succeeded before it starts.
- [ ] **03.13** Implement single/bulk Delete with confirmation, in-use safeguards, and per-item outcomes. Decide whether deleting an attached asset is blocked or requires explicit detach/replacement; never silently break public images.

**Commit 4: `test: verify upload lifecycle and asset integrity`**

- [ ] **03.14** Test unauthenticated upload/delete, invalid files, interrupted uploads, duplicate callbacks if applicable, order persistence, missing objects, in-use deletion, bulk failures, and public image refresh after replacement.

**Done when:** a real uploaded image survives refresh, appears in the library, can be ordered on a vehicle, and renders publicly without exposing upload credentials or breaking referenced assets.

### 04. Admin vehicle list, insert, edit, publish, duplicate and delete

**Branch:** `backend/admin-vehicle-workflows`.

**Evidence:** [inventory table](<../src/app/(protected)/admin/vehicles/_components/vehicle-inventory-table.tsx>), [vehicle form](<../src/app/(protected)/admin/vehicles/_components/vehicle-form.tsx>), [new route](<../src/app/(protected)/admin/vehicles/new/page.tsx>), [edit route](<../src/app/(protected)/admin/vehicles/[id]/edit/page.tsx>).

**Commit 1: `feat: load and query real admin inventory`**

- [ ] **04.01** Replace admin fixture imports with authenticated database reads for inventory and edit-by-ID. Return the existing not-found behavior for missing records and explicit error/retry states for database failures.
- [ ] **04.02** Move the current search fields (stock number, make, model, variant, location), status filter, and sortable title/price/mileage/status/location/updated columns to validated query parameters.
- [ ] **04.03** Preserve the current default updated-descending order and eight-row pages unless deliberately changed; keep counts/page boundaries accurate after filtering, creation, and mutations.
- [ ] **04.04** Define row selection across pages and filters. Bulk actions must operate on explicit validated IDs, not an ambiguous "all" selection or records that disappeared from the current filter.

**Commit 2: `feat: insert and update inventory from all form tabs`**

- [ ] **04.05** Implement the real **car insert** operation and map every Basics, Pricing, Technical, Features, Media, and Publishing field to the shared schema. Trim text; normalize line-separated features/labels; parse optional numbers and date values without turning blank input into misleading zeroes.
- [ ] **04.06** Revalidate on the server: required text, minimum description length, permitted enums, finite/nonnegative numbers and integer fields, realistic registration/date rules, six-character VIN fragment, price, stock/slug collisions, and approved URL/media IDs.
- [ ] **04.07** Implement durable edit/update loading and saving, including media relationships. Define handling for stale concurrent edits rather than silently overwriting another staff member's latest change.
- [ ] **04.08** Wire Save draft separately from publication, agreeing on which fields an incomplete draft may omit. Current form "Publish" submits its selected status; make button labels and actual status transitions consistent and enforce publication requirements on the server.
- [ ] **04.09** Implement Preview with an approved staff-only preview path or token. An unpublished draft must not become public just because a staff member previews it.

**Commit 3: `feat: implement inventory lifecycle and bulk operations`**

- [ ] **04.10** Wire Mark sold and Archive row actions to validated lifecycle transitions and their timestamps; adjust availability/featured behavior according to Section 01.
- [ ] **04.11** Implement Duplicate with a new ID/slug/stock number and safe draft status; decide whether it shares or copies media references and clear sale/reservation/publication/history fields that must not be inherited.
- [ ] **04.12** Implement bulk Mark sold and Archive with confirmation, validated ID limits, repeatable behavior on retries, and clear all-or-partial success semantics. Refresh selection, table counts, and related views after completion.
- [ ] **04.13** Implement the requested **car delete** workflow only after approving its policy. There is currently no delete control: add the UI/action deliberately, distinguish archive from permanent deletion, preserve inquiry history, and avoid cascading deletion of shared media.
- [ ] **04.14** Wire "View public page" to the actual canonical slug and agreed visibility rules; draft/nonpublic rows should use Preview or explain why no public page exists.

**Commit 4: `test: verify inventory mutations and public propagation`**

- [ ] **04.15** Test create -> refresh -> edit -> publish -> reserve/sell/archive/delete as approved; verify persisted fields, images, timestamp transitions, uniqueness failures, bulk edge cases, and invalid input.
- [ ] **04.16** Call mutations directly with anonymous, ordinary staff, and master-admin sessions. Verify ordinary staff can manage inventory but anonymous users cannot, independently of page/layout controls.
- [ ] **04.17** Verify the corresponding public pages and dashboard counts update after each successful mutation and do not show a success toast for failed writes.

**Done when:** staff can manage a vehicle end to end using durable data and the public inventory reflects the approved lifecycle.

### 05. Public homepage, vehicle list and keyword search

**Branch:** `backend/public-vehicle-catalog`.

**Evidence:** [homepage](<../src/app/(public)/(marketing)/page.tsx>), [vehicle listing](<../src/app/(public)/(marketplace)/vehicles/page.tsx>), [search results](<../src/app/(public)/(marketplace)/vehicles/_components/vehicle-search-results.tsx>), [vehicle cards](../src/components/vehicle/vehicle-card.tsx).

**Commit 1: `feat: render public vehicle lists from database queries`**

- [ ] **05.01** Replace homepage/demo selection with a bounded featured-public-vehicle query. Define deterministic ordering and what to show when there are fewer featured cars or none.
- [ ] **05.02** Replace listing fixture imports with eligible public records. Preserve card price, registration, mileage, fuel, transmission, cover image, display labels, comparison control, and canonical details link.
- [ ] **05.03** Render accurate result counts, empty catalog/no-results states, loading feedback, and explicit unavailable-service errors; never substitute demo cars when a database query fails.

**Commit 2: `feat: connect catalog search and bounded result navigation`**

- [ ] **05.04** Make `q` a shareable source of truth in the URL rather than only initial local state. Preserve query state across navigation, back/forward, direct links, and clearing the search.
- [ ] **05.05** Execute the approved keyword semantics through the database query layer; test make/model/variant, German body/fuel/transmission labels, color, location, registration, equipment, and labels.
- [ ] **05.06** Agree on bounded delivery as stock grows: a deliberately small server-loaded catalog or server pagination/load-more. Public filter controls, user-selectable sorting, pagination, and load-more are **not currently implemented**; do not pretend existing controls need wiring.
- [ ] **05.07** If approved, add make/model, price, registration, mileage, fuel, transmission, and body filters plus sort controls as a separate milestone. Define facets/counts, ranges, stable tie-breakers, reset behavior, and query validation before exposing them.

**Commit 3: `test: verify public eligibility and search behavior`**

- [ ] **05.08** Verify draft/archived records never appear; reserved/sold records follow the approved policy; feature changes and new publications update homepage and listing without a redeploy.
- [ ] **05.09** Test empty and populated catalogs, text normalization, multi-term search, invalid/oversized query values, result limits, URL navigation, and query failure UI.

**Done when:** a staff-created eligible car is visible and searchable on the real public site, while nonpublic data is excluded at the query layer.

### 06. Vehicle details, availability, dealer and similar vehicles

**Branch:** `backend/public-vehicle-details`.

**Evidence:** [detail route](<../src/app/(public)/(marketplace)/vehicles/[slug]/page.tsx>), [gallery](<../src/app/(public)/(marketplace)/vehicles/[slug]/_components/vehicle-image-gallery.tsx>), [dealer fixture](../src/data/dealers.ts).

**Commit 1: `feat: serve canonical public vehicle detail records`**

- [ ] **06.01** Replace fixture lookup and fixture-based `generateStaticParams` assumptions with a database-backed slug lookup. Newly published vehicles must work without rebuilding a hard-coded slug list.
- [ ] **06.02** Apply the shared visibility policy to guessed slugs and metadata lookups as well as page rendering. Return the agreed not-found/unavailable behavior for missing, draft, archived, reserved, and sold vehicles.
- [ ] **06.03** Render all stored technical data, features, description, owner count, price, location, and optional consumption/CO2 values. Remove the hard-coded previous-owner count and never invent missing technical data.
- [ ] **06.04** Replace unconditional "immediately available" and "inspected vehicle" claims with approved status/inspection-derived output. Keep internal inspection workflow details out of public responses.

**Commit 2: `feat: connect detail media dealer and related inventory`**

- [ ] **06.05** Load ordered media and meaningful alt text for the gallery and image preview; preserve client-side viewer interactions without introducing a gallery database API unnecessarily.
- [ ] **06.06** Load the correct dealership/contact record; ensure desktop/mobile call links and contact CTAs agree with settings. Do not display fixture dealer ratings/review counts as verified live reviews.
- [ ] **06.07** Query similar vehicles by the existing same-body-type rule with an explicit limit and ordering; exclude the current car and all ineligible cars, and agree on fallback/hidden-section behavior.
- [ ] **06.08** Pass a valid canonical vehicle reference into the contact CTA. Resolve `?vehicle=<slug>` securely in Section 09; a query-string label alone is not a trusted vehicle relation.
- [ ] **06.09** Wire record-derived page title, description, OpenGraph image/URL, and canonical path; final sitemap/redirect/cache coverage is in Section 15.

**Commit 3: `test: verify live detail and lifecycle rendering`**

- [ ] **06.10** Test unknown/nonpublic slugs, missing media, edited slugs, correct dealer/owner data, sold/unavailable claims, similar-vehicle exclusions, and updates to images/price/status without stale output.

**Done when:** the public detail view is a truthful projection of the same vehicle edited in the dashboard.

### 07. Comparison with live inventory, without unnecessary customer accounts

**Branch:** `feature/live-vehicle-comparison`.

**Evidence:** [comparison state provider](../src/components/providers/vehicle-state-provider.tsx), [comparison table](<../src/app/(public)/(marketplace)/vehicle-comparison/_components/vehicle-comparison-table.tsx>), [vehicle actions](../src/components/vehicle/vehicle-actions.tsx).

**Commit 1: `feat: resolve selected comparison ids against public inventory`**

- [ ] **07.01** Keep the existing anonymous localStorage selection and three-vehicle maximum unless requirements change. Do not create user accounts or a database table just to persist an anonymous browser preference.
- [ ] **07.02** Resolve selected IDs using a bounded public query/action/endpoint appropriate to the provider's client-side state; return only approved public records and fields.
- [ ] **07.03** Prune or explain deleted/unpublished selections, prevent duplicate IDs, and handle unavailable/sold vehicles according to the agreed comparison policy.
- [ ] **07.04** Replace fixture-resolved prices/specifications and hard-coded availability with current data, keeping card/detail/table comparison controls synchronized.

**Commit 2: `test: cover comparison state and catalog changes`**

- [ ] **07.05** Verify persistence on refresh, removing/clearing selections, the maximum, corrupt or legacy browser storage, stale IDs, database failure, and a vehicle changing visibility after being selected.

**Done when:** comparison remains an anonymous browser feature but always renders current eligible inventory. Account-based favorites or cross-device comparison are optional future products, not existing missing backend.

### 08. Dealership settings and shared public business data

**Branch:** `backend/dealership-settings`.

**Evidence:** [settings UI](<../src/app/(protected)/admin/settings/_components/settings-panel.tsx>), [site configuration](../src/config/site.config.ts), [dealer data](../src/data/dealers.ts), [header](../src/components/layout/site-header.tsx), [footer](../src/components/layout/site-footer.tsx).

**Commit 1: `feat: persist validated dealership settings`**

- [ ] **08.01** Define one settings/dealership source of truth appropriate to the approved single-dealer scope; reconcile `siteConfig` and `Dealer` instead of maintaining two conflicting contact records.
- [ ] **08.02** Persist all current editable fields: legal name, short name, tagline, website URL, description, phone, email, street, postal code, city, country, and map URL.
- [ ] **08.03** Decide explicitly how existing additional phone numbers, opening hours, social links, dealer rating, and review count are managed. Keep approved config for fields with no editor or add an editor deliberately; do not silently discard them.
- [ ] **08.04** Validate field length, email/phone format, map URL scheme/host policy, and public text. Treat the canonical origin as controlled deployment configuration or an explicitly approved coordinated change; ordinary settings edits must not rewrite auth trusted origins.

**Commit 2: `feat: save settings and propagate public business details`**

- [ ] **08.05** Make the current uncontrolled fields a real validated edit/save workflow with durable server mutation, loading, failure, success, and concurrent-change handling.
- [ ] **08.06** Read saved business details in public contact/header/footer, vehicle dealer panels, relevant marketing/legal output, and admin identity where appropriate. Preserve one consistent address, phone, email, map link, and opening-hours source.
- [ ] **08.07** Define cache refresh for public settings and distinguish "display contact email" from private notification recipients/provider credentials.
- [ ] **08.08** Replace imported settings defaults with a deliberate initial configuration/migration path. Missing mandatory settings should be diagnosed, not silently replaced by unrelated demo identity.

**Commit 3: `test: verify settings persistence and consumers`**

- [ ] **08.09** Test save -> refresh -> public propagation, invalid settings/URLs, ordinary staff authorization, unauthenticated mutation denial, and canonical-domain consistency without expanding trusted origins.

**Done when:** updating a permitted dealership setting persists and consistently changes every intended public/admin consumer.

### 09. Contact, vehicle-interest, test-drive and service inquiry intake

**Branch:** `backend/inquiry-intake`.

**Evidence:** [contact form](<../src/app/(public)/(marketing)/contact/_components/contact-form.tsx>), [contact schema](<../src/app/(public)/(marketing)/contact/_schemas/contact-form.schema.ts>), [contact route](<../src/app/(public)/(marketing)/contact/page.tsx>), [services](<../src/app/(public)/(marketing)/services/page.tsx>).

**Current state:** the form waits and shows success without saving or sending anything. A detail-page `?vehicle=` link is ignored. Appointment preferences are requests, not confirmed bookings.

**Commit 1: `feat: model and validate durable customer inquiries`**

- [ ] **09.01** Add a lead/inquiry model with stable ID, customer name/email, optional phone, message, source, requested service/appointment type, preferred date, optional vehicle relation, and created/updated timestamps.
- [ ] **09.02** Define how the form's five choices map to stored values and admin source labels: `Probefahrt`, `Beratung`, `Fahrzeugbewertung`, `Werkstatt`, and `Rückruf`. Preserve the distinction between requested service and intake source (`contact`, `test-drive`, `callback`).
- [ ] **09.03** Align frontend and server validation: name length, valid email, optional phone, one of the approved appointment types, valid preferred date, message size limits, and required consent. The schema contains phone but the form does not render/register it; agree to expose it or remove the unused field.
- [ ] **09.04** Validate dates on the server in the dealership timezone, including invalid/past dates. Decide whether general inquiries really require a date and whether weekends/opening hours constrain requested dates; do not implement a reservation calendar without approval.
- [ ] **09.05** Decide what evidence of this submission's privacy acknowledgement is required (for example text/policy version and timestamp), plus retention/deletion rules. Do not confuse inquiry acknowledgement with marketing consent or the earlier decision not to audit auth-form consent.
- [ ] **09.06** Resolve optional vehicle context server-side against current public eligibility. Preserve useful vehicle-interest history if a car is later archived/deleted, without trusting arbitrary client-supplied names, prices, or IDs.

**Commit 2: `feat: connect public forms and contextual contact links`**

- [ ] **09.07** Add a public submission Server Action or Route Handler that validates, applies abuse controls, persists the lead, and returns a clear accepted result. No login should be required for a legitimate contact request.
- [ ] **09.08** Add appropriate request-size/rate limits, submission deduplication/retry behavior, and an agreed bot mitigation strategy; never assume Better Auth's rate limit automatically covers business forms.
- [ ] **09.09** Read `vehicle` from the contact URL, display valid vehicle context, attach its stable reference, and handle missing/stale/invalid context explicitly. General contact must still work without a vehicle.
- [ ] **09.10** Remove the artificial delay/success path. Keep values on failed submission, prevent accidental duplicate submits, and show success only after durable acceptance; wording must say request received, not appointment confirmed.
- [ ] **09.11** Route service CTAs into the same validated inquiry workflow; optionally preselect an approved service type. There is no separate workshop/trade-in/booking form to integrate today.

**Commit 3: `test: verify inquiry intake and durable inbox visibility`**

- [ ] **09.12** Test each appointment type, general and vehicle-specific requests, ignored/forged vehicle references, date/time boundaries, consent rejection, oversized requests, rate limits, retries/duplicates, database failures, and successful persistence.

**Done when:** a real visitor's request survives refresh/restart and becomes a real staff-visible lead without fake success or an accidental booking promise.

### 10. Inquiry email notifications and delivery reliability

**Branch:** `backend/lead-notifications`.

**Decision gate:** confirm whether launch requires staff notification emails, visitor acknowledgements, external CRM delivery, or database/inbox-only handling. None is configured today; no provider is selected by this checklist. If inbox-only is approved, document that scope and defer provider-specific items.

**Commit 1: `feat: configure approved inquiry delivery integration`**

- [ ] **10.01** Select the approved provider/delivery mechanism and obtain sender/domain verification, private recipients, templates, environment values, quotas, and development/test mode. Do not use the submitted visitor email as an unauthenticated sender.
- [ ] **10.02** Create safe staff notification content with inquiry ID, source, vehicle context, and a protected inbox link; set a validated reply-to where appropriate and escape customer text.
- [ ] **10.03** Add a visitor acknowledgement only if approved, with truthful request-not-booking wording and no unnecessary echo of sensitive customer data.

**Commit 2: `feat: track and retry inquiry delivery outcomes`**

- [ ] **10.04** Keep durable lead acceptance separate from delivery success. Record pending/sent/failed outcomes and a deduplication key; provider failure must not lose the saved lead or create duplicates when the visitor retries.
- [ ] **10.05** Implement a bounded retry/reconciliation path suited to deployment, with explicit staff-visible failures. Add a worker/queue/outbox only if the approved delivery guarantees require it.
- [ ] **10.06** If provider callbacks are used, verify signatures and handle duplicate/out-of-order callbacks; never trust a public delivery-status payload without verification.

**Commit 3: `test: verify inquiry notifications without real customer spam`**

- [ ] **10.07** Test provider errors/timeouts, retries, duplicate sends/callbacks, environment separation, template escaping, protected links, and successful delivery using test recipients only.

**Done when:** the approved recipients receive reliable notifications and notification failures are observable without changing a persisted lead into a fake failure or a lost request.

### 11. Admin leads inbox, customer contact and durable notes

**Branch:** `backend/admin-leads`.

**Evidence:** [leads page](<../src/app/(protected)/admin/leads/page.tsx>), [inbox](<../src/app/(protected)/admin/leads/_components/leads-inbox.tsx>), [lead type](../src/types/admin.ts).

**Commit 1: `feat: load real inquiry records in the staff inbox`**

- [ ] **11.01** Replace lead/vehicle fixtures with staff-only list/detail queries backed by Section 09 records.
- [ ] **11.02** Preserve search over name, email, phone, message, and vehicle make/model; keep newest-first ordering and add bounded pagination as records grow.
- [ ] **11.03** Populate the detail sheet with correct source, service/appointment preference, date, linked vehicle, message, customer links, and created/updated data. Show a sensible historical reference if the vehicle is no longer public or has been deleted under the approved policy.
- [ ] **11.04** Keep telephone and email actions as real `tel:`/`mailto:` links; a browser link does not mean the application sent a tracked response.

**Commit 2: `feat: persist internal lead notes`**

- [ ] **11.05** Choose a single editable note versus append-only note history. The UI displays `notesCount`; if history is chosen, persist note ID, author, timestamps, and content with appropriate editing rules.
- [ ] **11.06** Wire note input/Save note to server validation and a protected mutation, with durable readback, accurate counts, pending/error feedback, and handling for concurrent edits.
- [ ] **11.07** Enforce private customer/note projections and approved retention. Add deletion/anonymization operationally if needed; lead status, assignment, closure, and delete controls do not currently exist and need separate approval before adding CRM scope.

**Commit 3: `test: verify inquiry to staff follow-up flow`**

- [ ] **11.08** Test public submission -> inbox search -> detail -> saved note -> refresh, plus unauthorized direct queries/actions, unknown lead IDs, no-vehicle leads, stale links, and note failures.

**Done when:** staff see real requests and can save genuine internal follow-up notes; customer data is never exposed by public endpoints.

### 12. Dashboard statistics, recent leads and vehicle-view counters

**Branch:** `backend/dashboard-metrics`.

**Evidence:** [dashboard overview](<../src/app/(protected)/admin/_components/dashboard-overview.tsx>), [mock admin metrics](../src/data/admin/index.ts).

**Commit 1: `feat: replace dashboard fixtures with inventory and lead aggregates`**

- [ ] **12.01** Define KPI meanings and periods: Inventory, Leads, Sold vehicles, status counts/percentages, total vehicle views, and inventory inquiries. Decide lifetime versus recent-window counts and how archived/deleted vehicles affect them.
- [ ] **12.02** Use bounded database aggregates/grouping rather than loading every vehicle/lead into the browser. Ensure all status totals use the same agreed lifecycle rules as the inventory list.
- [ ] **12.03** Load the latest five real leads with relevant vehicle context and working navigation; define empty-state behavior for a new business database.
- [ ] **12.04** Derive inquiry counts from accepted linked inquiries, not seeded numbers or email delivery counts. Handle general-contact leads separately where relevant.

**Commit 2: `feat: implement approved vehicle view measurement`**

- [ ] **12.05** Decide whether actual view tracking is required for launch. If not, remove/hide unsupported views rather than display synthetic numbers.
- [ ] **12.06** If enabled, define a view (public detail render, browser event, or another approved measure), bot/prefetch/reload handling, deduplication/time window, and privacy/consent requirements before storing events.
- [ ] **12.07** Persist only the necessary counter/aggregate or minimal events with retention, rate limits, and atomic updates. Never count private previews as public interest or accept arbitrary increments from anonymous callers.

**Commit 3: `test: verify metrics reconcile with source records`**

- [ ] **12.08** Test counts after create/publish/sell/archive, new general/vehicle inquiries, empty periods, percentages with zero inventory, view deduplication if enabled, and dashboard access/error states.

**Done when:** every shown KPI can be reconciled to defined stored data, and no mock view/inquiry figures are presented as actual business performance.

### 13. Admin workspace search and truthful account UI

**Branch:** `feature/admin-workspace-search`.

**Evidence:** [top bar](../src/components/admin/layout/admin-top-bar.tsx), [sidebar](../src/components/admin/layout/admin-sidebar.tsx), [auth shell](<../src/app/(auth)/_components/auth-shell.tsx>), [existing account action](<../src/app/(protected)/admin/accounts/new/actions.ts>).

**Commit 1: `feat: connect the existing workspace search`**

- [ ] **13.01** Agree on the top-bar Search field's scope: inventory only, or inventory plus leads and media. It currently does nothing; implement the approved bounded staff query or remove/disable it honestly.
- [ ] **13.02** Add query validation, controlled result limits, loading/no-results/error output, keyboard navigation where needed, and links to real records. Enforce server-side session checks so search cannot expose customer or private stock data.
- [ ] **13.03** Define how a global result opens the relevant leads/media detail UI, since those currently use local sheets/dialogs rather than record-detail routes.

**Commit 2: `fix: align staff identity and account copy with live auth`**

- [ ] **13.04** Replace sidebar/auth-shell claims such as mocked identity, future auth, and client account workspace with truthful staff-session copy. Preserve the existing working session name/email/role and sign-out behavior.
- [ ] **13.05** Keep Create account visible and callable only for master admin; do not turn regular business search/actions into master-admin-only features.
- [ ] **13.06** Correct historical backend/auth claims in the documentation and remove misleading "UI-only" labels only where real integrations are complete. Keep genuine placeholders explicit until implemented.

**Commit 3: `test: verify workspace and account permission boundaries`**

- [ ] **13.07** Test search result privacy and navigation, normal staff access, anonymous denial, live identity refresh, sign-out, and direct denial of account creation for ordinary staff. Existing helper tests alone are not end-to-end account-action coverage.

**Done when:** workspace controls work or are honestly unavailable, and the UI accurately describes the existing staff authentication model.

### 14. Marketing/services content, legal pages and cookie preferences

**Branch:** `feature/public-content-and-consent`.

**Evidence:** [about page](<../src/app/(public)/(marketing)/about-us/page.tsx>), [services](<../src/app/(public)/(marketing)/services/page.tsx>), [legal renderer](<../src/app/(public)/(legal)/_components/legal-page.tsx>), [cookie settings](<../src/app/(public)/(legal)/cookie-settings/page.tsx>), [German content](../src/content/de).

**Important distinction:** static marketing/legal content does not inherently need a database or CMS. This section covers truthful content and any approved dynamic integration; it must not create an unrequested page-builder project.

**Commit 1: `docs: approve content ownership and legal requirements`**

- [ ] **14.01** Review homepage benefits/trust claims, about-page narrative/statistics, service cards, dealer ratings/review counts, images, opening hours, and legal identity. Replace demo claims with approved real information.
- [ ] **14.02** Choose developer-managed static content versus an editorial backend for each content group. If staff editing is required, define the fields, draft/publish permissions, validation, and image associations before adding a CMS or database content model.
- [ ] **14.03** Obtain qualified review and final text for imprint, privacy, terms, and cookie information. Generic placeholder legal paragraphs are not a production legal policy.

**Commit 2: `feat: connect approved public content and consent behavior`**

- [ ] **14.04** Render approved static content or the selected content source and shared business settings; make service CTAs route to the correct inquiry type without implying online scheduling exists.
- [ ] **14.05** Inventory actual cookies/storage/external embeds/providers and decide what consent controls are needed. Cookie settings currently has no preference controls; auth, anonymous comparison, theme, analytics, media and embeds must be classified appropriately.
- [ ] **14.06** If required, implement a real preference UI, browser persistence, reopening/change/withdraw behavior, and gating of optional scripts/embeds. Do not add a consent database or force login unless audit/cross-device requirements justify it.
- [ ] **14.07** If optional analytics or third-party media depends on consent, connect that gating to the actual runtime loading path, not just a stored toggle. Keep necessary staff auth functional.

**Commit 3: `test: verify approved content and preference effects`**

- [ ] **14.08** Verify all four legal pages have the intended specific content, contact information agrees with settings, service links preserve context, and optional resources obey changed preferences after refresh if consent management is required.

**Done when:** public content is truthful, legal placeholders are resolved, and any approved consent choice has a real effect. A CMS remains optional.

### 15. Dynamic SEO, sitemap, localized links and cache consistency

**Branch:** `backend/seo-and-cache-consistency`.

**Evidence:** [sitemap](../src/app/sitemap.ts), [robots](../src/app/robots.ts), [metadata helper](../src/lib/metadata.ts), [root metadata](../src/app/layout.tsx), [localized routes](../src/config/routes.config.ts), [proxy](../src/proxy.ts).

**Commit 1: `fix: unify canonical domain and live metadata`**

- [ ] **15.01** Resolve the configuration/auth domain mismatch with the user; use the approved origin consistently in metadata base, canonical/OpenGraph URLs, sitemap, public notifications, and deployment settings.
- [ ] **15.02** Use actual public vehicle records for detail metadata and images. Keep private routes/noindex behavior and ensure nonpublic vehicles never leak their descriptions/images through metadata endpoints.
- [ ] **15.03** Keep German canonical routes (`/fahrzeuge`, `/fahrzeuge/[slug]`, etc.) and existing English internal rewrites/redirects. Test slugs with dots, direct URLs, preserved query strings, and comparison/contact links.

**Commit 2: `feat: generate inventory sitemap and invalidate dependent views`**

- [ ] **15.04** Replace sitemap fixture enumeration with a bounded/paged query for eligible public slugs; use persisted modification/publication timestamps instead of a new timestamp for every request.
- [ ] **15.05** Define slug-change redirects versus immutable slugs, and the public response policy for sold/archived/deleted vehicles. Prevent old slugs from accidentally identifying a different vehicle.
- [ ] **15.06** Invalidate/revalidate every affected surface after inventory/media/settings writes: staff list/edit, homepage, catalog, vehicle detail/metadata, similar vehicles, comparison resolution, sitemap, and dashboard where applicable.
- [ ] **15.07** Keep private/staff responses out of shared caches; choose explicit freshness for public reads and avoid Production database reads being required accidentally during unrelated build steps.
- [ ] **15.08** Keep filtered/search pages canonicalized appropriately, robots rules consistent, and staff/API endpoints excluded without treating robots as access control.

**Commit 3: `test: verify publish to public refresh and SEO lifecycle`**

- [ ] **15.09** Test publish/update/unpublish, image replacement, price changes, slug changes, setting changes, and removal across public pages plus metadata/sitemap. A successful write is not complete if a stale public page still shows old data.

**Done when:** public links, search-engine metadata, and cached views accurately reflect live eligible inventory.

### 16. Integration tests, real-data cutover and production release

**Branch:** `test/backend-integration-and-release`.

**Commit 1: `test: cover actual backend boundaries and complete business flows`**

- [ ] **16.01** Add targeted integration coverage for the real Server Actions/Route Handlers and database queries, not only pure access helpers. Test anonymous, regular staff, and master admin; explicitly try account creation/role escalation through the actual endpoint/action.
- [ ] **16.02** Cover vehicle insert/edit/status/bulk/delete behavior, media lifecycle, public visibility, comparison resolution, settings propagation, inquiries, lead notes, and optional notification/metrics integrations.
- [ ] **16.03** Verify failure paths: unavailable database/storage/email, malformed/malicious payloads, unique conflicts, stale writes, duplicate submissions/provider callbacks, invalid dates, unknown IDs, and partial external-service failures.
- [ ] **16.04** Add end-to-end scenarios: staff inserts and publishes a car -> visitor finds/details/compares it -> visitor submits vehicle inquiry -> staff receives it and saves a note -> car is sold/archived and all public surfaces agree.
- [ ] **16.05** Run the existing pnpm tests, type-check, lint, production build, and changed-file formatting checks. Add test tooling only when actual integration/browser requirements need it; isolate test data from Production.

**Commit 2: `chore: prepare real data migration and operational visibility`**

- [ ] **16.06** Reconcile and import approved real stock/dealership/media data with validation, stable IDs/relationships, duplicates handling, and an explicit dry-run/report. Retain demo fixtures only for tests or clearly separated development usage.
- [ ] **16.07** Remove remaining runtime imports of vehicle/dealer/admin demo fixtures from production business paths; retain genuinely static approved content/configuration.
- [ ] **16.08** Add explicit server error reporting and health/readiness checks appropriate to database/storage/delivery dependencies; redact passwords, auth/session tokens, connection strings, uploaded secrets, and customer messages from logs.
- [ ] **16.09** Document data backup/recovery, media-orphan cleanup, failed-delivery reconciliation, privacy retention/deletion, and basic dependency/cost monitoring without assuming a full observability platform is necessary.
- [ ] **16.10** Update README/handoff/current-state docs with real commands, implemented backend boundaries, required environment-variable names only, and any deliberately deferred feature.

**Commit 3: `chore: document and verify controlled production deployment`**

- [ ] **16.11** Confirm environment separation for runtime database, direct migration database, storage buckets/keys, sender/recipients, and any test callbacks. Preserve existing exact auth/Prisma pins; do not use floating installs for these integrations.
- [ ] **16.12** Review migrations, test them on an isolated branch, take the approved recovery point, apply through the Production migration workflow, regenerate the Prisma client as required, then deploy compatible code deliberately.
- [ ] **16.13** Confirm how Production deployment is triggered: `vercel.json` currently disables Git deployments. Record the approved manual/CLI/CI path or deliberately change that policy; a merge alone is not verified deployment.
- [ ] **16.14** Validate the deployed revision and perform a safe Production smoke test: login, ordinary staff restrictions, public listing/detail, known media, settings rendering, inquiry test with an approved recipient, and protected inbox access. Do not generate unapproved customer emails or real stock changes.
- [ ] **16.15** Record release evidence and rollback criteria for code, schema, imported data, and storage. Confirm no secrets/demo customer records entered commits.

**Done when:** approved features are verifiably running on the intended Production revision with real data, rollback instructions, and no silent fixture fallback.

## Coverage register: every existing feature has an owner

| Existing surface/control                                         | Current behavior                                  | Roadmap owner                                        |
| ---------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------- |
| Login, remember-device, safe return path, sign-out               | Real Better Auth/session flow                     | Preserve baseline; 13, 16 regression checks          |
| Account creation and admin-only account UI                       | Real protected account action                     | Preserve baseline; 13, 16 direct permission checks   |
| Dashboard KPI cards, status chart, recent leads, views/inquiries | Demo aggregates                                   | 12                                                   |
| Admin vehicles list, search/status/sort/pages/selection          | Fixture queries/local state                       | 02, 04                                               |
| New/edit vehicle, every form tab                                 | Fake save/draft/preview; media outside schema     | 02, 03, 04                                           |
| Duplicate/sold/archive and bulk actions                          | Toast only                                        | 04                                                   |
| Delete car requested for the dynamic project                     | No existing control                               | 01 decision, 04 explicit addition                    |
| Media search/type/usage filters, detail dialog                   | Fixture data/local state                          | 03                                                   |
| Upload/reorder/remove/copy/download/delete, including bulk       | Toast only                                        | 03                                                   |
| Leads search/detail/contact links/notes                          | Fixtures; contact links work; notes do not save   | 09, 11                                               |
| Dealership and Contact settings tabs                             | Uncontrolled config defaults; fake save           | 08                                                   |
| Workspace search and mocked-identity copy                        | Search inert; some labels stale                   | 13                                                   |
| Home featured vehicles and vehicle cards                         | Static vehicle fixtures                           | 02, 05                                               |
| Public catalog keyword search                                    | Local fixture filtering                           | 02, 05                                               |
| Vehicle detail/specs/gallery/dealer/related cars                 | Fixtures with some hard-coded claims              | 03, 06, 08                                           |
| Comparison toggles/table/three-car limit                         | Browser-local IDs, fixture resolution             | 07                                                   |
| Contact form/service preferences/date/consent                    | Validated UI, no actual submission                | 09                                                   |
| Vehicle-specific contact links                                   | Vehicle query passed but ignored                  | 06, 09                                               |
| Staff/customer notifications                                     | No delivery integration                           | 10 decision/integration                              |
| Contact address/phone/email/map, footer/social/hours             | Static config/dealer sources                      | 08; static links need no separate backend            |
| About/services/home marketing                                    | Static text, claims and images                    | 14; CMS optional                                     |
| Imprint/privacy/terms/cookie settings                            | Generic legal placeholders; no preference UI      | 14                                                   |
| Navigation/mobile menu, theme, gallery/image preview             | Real browser/presentation behavior                | Retain; regression checks, no persistence API needed |
| Canonical routes, metadata, sitemap, robots                      | Real routing, but domain conflict and fixture SEO | 15                                                   |
| Error/loading/not-found/empty states                             | UI boundaries exist; real failures need wiring    | Each domain plus 16                                  |

## Explicit scope limits and unresolved choices

- The public site currently has no favorites, customer portal, newsletter, financing calculator, share/print/download vehicle actions, payment flow, dedicated trade-in form, or true booking/reservation system. Do not label these as implemented UI awaiting a backend.
- Public filters, user-selectable sorting, and pagination/load-more are proposed catalog improvements, not existing controls. The roadmap requires a conscious capacity/UX decision, not automatic scope expansion.
- Phone links, email links, social links, navigation, theme, and image viewers do not each need their own database/API.
- CRM pipelines, lead assignment/statuses, appointment slot capacity, multi-dealer tenancy, automated reservation expiry, customer account sync, CMS editing, analytics, and delivery providers require approval before being added beyond the existing interfaces.
- The list is complete against the reviewed source snapshot, not against unknown business requirements. Confirm open decisions with the user section by section; never treat an unchecked planning item as authorization to change Production or purchase a service.

## Current step and next action

- **Current:** Section **02 / 02.01-02.13 is complete, merged and user-retested** on `master` (`f4ab9b1`, 2026-11-18). Section **03 / 03.01-03.06** is implemented on `backend/media-library`. Vehicle photos are ordered, limited to 20 per vehicle, and cannot be shared across vehicles; position zero is the cover by convention. Public rendering remains limited to approved assets in the configured public bucket, and private assets remain unexposed. Migrations and storage tests remain confined to the isolated Section 03 child; Production remains untouched.
- **Next:** **Section 03 / 03.07**: wire the vehicle form’s upload, existing-asset attachment, reorder, and remove controls into actual state and persistence, deciding how unsaved vehicles hold uploads until a vehicle ID exists. Then implement validated atomic create/update persistence in 03.08. Configure storage CORS for approved app origins before wiring the browser uploader. No media upload UI or library query is wired yet.
- **Progress convention:** after each implementation milestone, update the corresponding numbered items in this file and report the current section/milestone, verification results, and next action.
