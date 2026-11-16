# Dynamic application implementation roadmap

Reviewed: 2026-11-16.

## Purpose and status

This is a source-based implementation plan for making the existing admin and public website dynamic. It is not a claim that the features below have already been implemented. Unchecked items are future work; each item must later be implemented technically and verified before it is checked.

The public website is called the "client side" in this document. This does **not** imply a new customer account system, payments, reservations, or a customer portal.

### What already works

- Better Auth email/password login, database sessions, sign-out, protected dashboard access, and master-admin-only account creation have been implemented. Preserve this work rather than rebuilding authentication.
- Prisma and Neon are configured. The current [schema](../prisma/schema.prisma) contains auth models only: `User`, `Session`, `Account`, `Verification`, and `RateLimit`. Inventory, media, business settings, and inquiries do not yet have database models.
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
- [ ] **01.05** Confirm currency/price precision, margin visibility, stock-number uniqueness, slug change policy, delete versus archive, and whether acquisition/reservation dates are managed automatically or editable.
- [ ] **01.06** Confirm the canonical public domain, media provider and file limits, notification expectations, appointment timezone, customer-data retention, and legal/cookie ownership. Request credentials privately only when the corresponding integration is being implemented.

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

**Commit 2: `refactor: define server-side business operation boundaries`**

- [ ] **01.07** Establish server-only query/mutation modules using the existing shared Prisma client. Define public read projections separately from staff projections; private margin, partial VIN, internal inspection workflow, notes, and customer data must not leak into public payloads.
- [ ] **01.08** Reuse Zod/server validation and the repository's error/UI patterns. Reject unsupported enum values and malformed IDs; return actionable failures, never artificial success or fallback demo data on database errors.
- [ ] **01.09** Define transaction boundaries, uniqueness/conflict handling, pagination limits, and cache invalidation ownership. Add actor/change timestamps where business changes require traceability, without introducing a generic event system unnecessarily.

**Commit 3: `test: lock business policy and authorization contracts`**

- [ ] **01.10** Add focused cases for the agreed visibility/lifecycle matrix and public/private projections; explicitly test that ordinary staff retain business access and account creation remains master-admin-only.

**Done when:** the decisions above are recorded, shared server conventions are in place, and later sections have an unambiguous contract. This section does not recreate auth or create fake Production records.

### 02. Vehicle database, reference data and query layer

**Branch:** `backend/vehicle-inventory`.

**Evidence:** [public vehicle contract](../src/types/vehicle.ts), [admin contracts](../src/types/admin.ts), [vehicle form schema](<../src/app/(protected)/admin/vehicles/_schemas/vehicle-form.schema.ts>), [demo vehicles](../src/data/vehicles.ts), [current Prisma schema](../prisma/schema.prisma).

**Commit 1: `feat: add inventory schema and development migration`**

- [ ] **02.01** Add a durable `Vehicle` model with stable ID, unique slug, stock number, make, model, variant, description, dealer relationship, location, exterior color, and condition (`used`, `demonstrator`, `annual`). Define the minimal dealer identity/relation required by this model; Section 08 extends/reuses it for business settings instead of adding a competing dealer source.
- [ ] **02.02** Persist price with exact money semantics and private margin estimate separately; never use formatted currency strings as stored money or expose the margin publicly.
- [ ] **02.03** Persist first registration, mileage, power kW, owner count, partial VIN, fuel type, transmission, body type, optional consumption, and optional CO2 emission. Define units and whether PS is derived from kW rather than independently editable inconsistent data.
- [ ] **02.04** Persist equipment/features, display labels, status, inspection state, featured/availability decisions, acquisition date, publication timestamp, reservation expiry if used, sold timestamp, and creation/update timestamps.
- [ ] **02.05** Add appropriate enums/constraints and indexes for actual queries: unique identifiers, public eligibility, updated-date ordering, status filtering, and dealer relationships. Do not make six-character VIN fragments globally unique unless explicitly justified.
- [ ] **02.06** Decide which makes/models/options need reference tables and which can remain validated values. Do not create a taxonomy management system just because sample data has arrays.
- [ ] **02.07** Create and test the Prisma migration against development/test Neon, preserving all existing auth tables. Define media and inquiry relationship deletion rules before dependent migrations are finalized.

**Commit 2: `feat: add staff and public inventory queries`**

- [ ] **02.08** Add staff list/detail queries and public list/detail/featured/related queries with explicit projections. Validate ID/slug lookups, stable ordering, counts, result limits, and invalid input handling.
- [ ] **02.09** Preserve the existing German keyword search semantics or document an approved change: multiple terms, labels/features, registration/location, case/accent normalization, and featured-first results. Verify the database implementation with examples from existing filter tests.
- [ ] **02.10** Define a public eligibility predicate reused across all public consumers; an undiscoverable draft must also be inaccessible by guessed slug, comparison ID, metadata generation, and inquiry lookup.
- [ ] **02.11** Return serializable, typed values to Client Components; consistently map database money, dates, nullable metrics, and media references rather than casting rows into existing frontend types.

**Commit 3: `test: verify inventory persistence and fixture import`**

- [ ] **02.12** Prepare a development-only fixture import/seed with stable relationships and repeatable behavior. Demo content must not silently become Production inventory; obtain approval and a real-data import plan separately.
- [ ] **02.13** Test duplicate identifiers, optional fields, numeric/date boundaries, malformed queries, eligible/ineligible records, deterministic pagination, and private-field exclusion using an isolated database branch.

**Done when:** a real vehicle can be stored and read through the correct staff/public query boundaries, migrations are reproducible, and no UI has to invent database fields.

### 03. Media uploads, library and vehicle image relationships

**Branch:** `backend/media-library`.

**Evidence:** [media library](<../src/app/(protected)/admin/media/_components/media-library.tsx>), [vehicle form Media tab](<../src/app/(protected)/admin/vehicles/_components/vehicle-form.tsx>), [media/admin types](../src/types/admin.ts), [Next image configuration](../next.config.ts).

**Current state:** upload, reorder, remove, copy URL, download, and delete controls are placeholders. The vehicle form schema has **no media field**, so simply connecting its existing submit handler will not save images.

**Commit 1: `feat: add media storage and upload authorization`**

- [ ] **03.01** Confirm the storage provider before installing anything. Store binary files in object storage and metadata/references in Postgres; keep provider keys server-side with separate environments.
- [ ] **03.02** Model media ID, provider object key, safe URL/access policy, title, original filename, type (`image`, `document`, `brand`), alt text, size, verified MIME type, optional width/height, uploader, and upload timestamp.
- [ ] **03.03** Authorize uploads using a fresh staff session; enforce approved file types/count/size, safe filenames, verified file contents where appropriate, and completion verification before an upload becomes a usable asset. Set separate document/image handling and avoid serving arbitrary active content as trusted site files.
- [ ] **03.04** Handle canceled, failed, partially completed, and orphaned uploads explicitly. Database and storage updates need a defined cleanup/retry path, not an assumption that they share a transaction.
- [ ] **03.05** Configure the trusted image host and rendering behavior; preserve responsive images, alt text, gallery compatibility, and appropriate public/private access for legal documents.

**Commit 2: `feat: persist vehicle image attachments and ordering`**

- [ ] **03.06** Add vehicle-media relationships with deterministic order and a clear cover-image rule. Decide whether an asset can be reused by several vehicles and represent that relationship accurately.
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

- **Current:** Section **01** is in progress on `backend/domain-foundation`, created from `origin/master` at `98b66c2`. Points **01.01-01.04** are approved and documented; runtime business rules are not implemented yet.
- **Next:** point **01.05**: approve money, identifiers, deletion policy, and lifecycle dates. Points **01.05-01.10** remain pending.
- **Progress convention:** after each implementation milestone, update the corresponding numbered items in this file and report the current section/milestone, verification results, and next action.
