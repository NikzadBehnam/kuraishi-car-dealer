# Backend Phases 1–5 Testing Guide

This guide verifies the backend work implemented through the end of Phase 5 on
the `backend-BetterAuth` branch. It covers the server foundation, database
domain, vehicle reads and writes, UploadThing media, public lead submission,
the admin leads inbox, and appointment management.

Use this as a functional QA guide. It records the repository health observed on
27 September 2026 separately from the feature checks so that a working UI flow
is not confused with a release-ready branch.

## 1. Current audit result

UI testing can start now.

The connected development database is migrated and already contains useful
test data:

| Record             | Count at audit time |
| ------------------ | ------------------: |
| Users              |                   1 |
| Vehicles           |                  24 |
| Media assets       |                  73 |
| Leads              |                   0 |
| Valuation requests |                   0 |
| Appointments       |                   0 |
| Activity events    |                   3 |

The empty lead, valuation, and appointment tables are useful: the records made
during this guide will be easy to identify.

### Automated checks observed during the audit

| Check                       | Result  | Notes                                                                                                                                  |
| --------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`                 | Pass    | No ESLint warnings or errors.                                                                                                          |
| `npx prisma validate`       | Pass    | Prisma schema is valid.                                                                                                                |
| `npx prisma migrate status` | Pass    | All 6 migrations are applied.                                                                                                          |
| `pnpm test`                 | Partial | 133 tests pass; 1 test file cannot load because Node's strip-only TypeScript loader does not support a constructor parameter property. |
| `pnpm typecheck`            | Fail    | Two TypeScript errors are listed below.                                                                                                |
| `pnpm build`                | Fail    | Compilation succeeds, then the build stops on the vehicle-form TypeScript error.                                                       |
| `pnpm format:check`         | Fail    | Prettier reports broad formatting drift across 213 files, including generated and pre-existing files.                                  |

Known automated-check failures:

1. `src/lib/auth/authorization-policy.test.ts` cannot load because
   `AuthorizationDeniedError` uses a TypeScript constructor parameter property,
   which is unsupported by `node --experimental-strip-types` in strip-only
   mode.
2. `src/app/(protected)/admin/vehicles/_components/vehicle-form.tsx:101`
   reports that `vehicle` may be undefined.
3. `src/features/media/media-contracts.test.ts:76` uses a BigInt literal while
   the TypeScript target is below ES2020.

These do not prevent starting the development server and manually testing the
implemented workflows, but they must be fixed before the branch is considered
release-ready.

## 2. Scope verified in the branch history

The implementation is grouped cleanly in these commits:

| Phase     | Commit    | Implemented scope                                                                                                                            |
| --------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 1   | `479a562` | Shared contracts, validation, server foundation, capability authorization                                                                    |
| Phase 2   | `de2a015` | Vehicle, media, lead, valuation, appointment, engagement, and audit models; deterministic development import                                 |
| Phase 3   | `3e4ef54` | SQL-backed public catalogue, homepage facets and featured vehicles, detail pages, metadata, similar vehicles, sitemap, admin inventory reads |
| Phase 4   | `4814c4a` | Vehicle create/update/lifecycle/duplicate commands and UploadThing-backed media library                                                      |
| Phase 5.1 | `a6a3211` | Public contact lead submission                                                                                                               |
| Phase 5.2 | `838158c` | Public vehicle valuation submission                                                                                                          |
| Phase 5.3 | `20ff8f2` | SQL-backed admin leads inbox                                                                                                                 |
| Phase 5.4 | `8765a1c` | SQL-backed appointment board and appointment commands                                                                                        |

## 3. Test environment setup

### 3.1 Use the supported runtime

The repository requires Node 24.x and pnpm 10.26.1. The audit machine was using
Node 25.8.0, which produces an engine warning and may contribute to test-runner
differences.

Check the runtime:

```powershell
node --version
pnpm --version
```

### 3.2 Verify configuration without exposing secrets

The following values must be configured in `.env`:

- `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
- `DATABASE_URL`
- `DIRECT_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL=http://localhost:3000`
- `UPLOADTHING_TOKEN`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`

All core values above were present at audit time. Do not paste their values into
test reports or screenshots.

### 3.3 Check the database

```powershell
npx prisma validate
npx prisma migrate status
```

Expected result: the schema validates and all 6 migrations are applied.

The catalogue is already populated. Only if a fresh development database has
no vehicles should the deterministic import be run:

```powershell
$env:ALLOW_DEVELOPMENT_SEED="IMPORT_MOCK_CATALOG"
pnpm seed:development
Remove-Item Env:ALLOW_DEVELOPMENT_SEED
```

The import is deterministic and idempotent. It does not create users, leads,
appointments, or audit records, and it must remain explicitly enabled by the
safety variable.

### 3.4 Start the application

The correct development command is:

```powershell
pnpm serve
```

Open [http://localhost:3000](http://localhost:3000). Use two browser sessions:

- a normal window logged in as the seeded admin;
- a private/incognito window for anonymous public and authorization checks.

Sign in at [http://localhost:3000/login](http://localhost:3000/login) with the
email and password from `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.

For test records, use a unique suffix such as `QA-20260927-01`. Do not edit or
delete imported media when a newly-created QA record can be used instead.

## 4. Route map

### Public routes included in this test pass

| URL                   | What to test                                              |
| --------------------- | --------------------------------------------------------- |
| `/`                   | SQL-backed featured vehicles, facets, and homepage search |
| `/fahrzeuge`          | SQL-backed listing, filters, sort, pagination             |
| `/fahrzeuge/[slug]`   | Vehicle detail, metadata, similar vehicles                |
| `/kontakt`            | Public contact lead submission                            |
| `/fahrzeug-verkaufen` | Vehicle valuation submission                              |
| `/sitemap.xml`        | Static public routes plus visible vehicle URLs            |

German URLs are canonical. For example, `/vehicles` redirects to
`/fahrzeuge`, while the server internally rewrites `/fahrzeuge` to the English
route directory.

### Admin routes included in this test pass

| URL                         | What to test                                                |
| --------------------------- | ----------------------------------------------------------- |
| `/admin/vehicles`           | Inventory read, search, filters, sort, pagination, commands |
| `/admin/vehicles/new`       | Create vehicle                                              |
| `/admin/vehicles/[id]/edit` | Update vehicle                                              |
| `/admin/media`              | UploadThing upload, search, filters, details, deletion      |
| `/admin/leads`              | Live lead/valuation inbox and lead-to-appointment handoff   |
| `/admin/appointments`       | Calendar, search, filters, create, reschedule, lifecycle    |

The screenshot supplied for this audit accurately reflects this navigation.
The Dashboard, Users, Activity, and Settings links are visible, but they are not
all backend-complete in Phases 1–5; see the limitations section.

## 5. Recommended end-to-end test order

Run the tests in this order so that each new record feeds the next workflow:

1. Verify authorization.
2. Verify the existing public catalogue.
3. Create a dedicated QA vehicle in Admin.
4. Publish it and verify it publicly.
5. Upload and delete a dedicated QA image.
6. Submit a public contact request and reference the QA vehicle in its message,
   or submit a general enquiry.
7. Submit a public valuation request.
8. Inspect both records in Admin Leads.
9. Create an appointment from a lead.
10. Exercise appointment status and rescheduling rules.

## 6. Phase 1 — contracts, validation, and authorization

### Test 1.1: anonymous admin protection

1. In the private window, open `/admin`.
2. Repeat with `/admin/vehicles`, `/admin/leads`, `/admin/appointments`, and
   `/admin/media`.

Expected:

- Each request redirects to `/login`.
- The callback URL points back to the requested admin page.
- No admin data flashes before the redirect.

### Test 1.2: role boundary

If CUSTOMER or STAFF test accounts are available, sign in with each and open an
admin route.

Expected:

- CUSTOMER and STAFF receive the admin unauthorized view.
- ADMIN receives the full admin shell.

The implemented admin boundary intentionally requires the `ADMIN` role. UI
visibility is not the security boundary; the server actions and queries also
check capabilities.

### Test 1.3: validation contract smoke test

1. Open `/admin/vehicles/new` as ADMIN.
2. Submit an empty or clearly incomplete form.
3. Enter invalid values such as an invalid `firstRegistration`, fewer than 6
   VIN characters, an empty features list, or a zero price.

Expected:

- The form stays open.
- Field-level errors are shown.
- No partial vehicle record appears in `/admin/vehicles`.

## 7. Phase 2 — database domain and deterministic seed

### Test 2.1: catalogue relationships

1. Open `/admin/vehicles` and confirm that the imported catalogue appears.
2. Open `/admin/media` and filter Usage to `Vehicle`.
3. Open Details on a vehicle image.

Expected:

- Vehicle cards contain stock, price, mileage, status, and cover-image data.
- Vehicle-linked media shows the associated make, model, and stock number.
- Image order is reflected by the cover image and the ordered image gallery on
  the public detail page.

### Test 2.2: seed idempotency, optional

Only run this on a disposable development database.

1. Record the vehicle and media counts.
2. Run the deterministic development import twice.
3. Compare the counts and inspect several stock numbers and slugs.

Expected:

- The second run does not create duplicates.
- Existing users, leads, appointments, and activity records remain untouched.

## 8. Phase 3 — SQL-backed vehicle reads

### Test 3.1: homepage facets and featured vehicles

1. Open `/` in the anonymous window.
2. Confirm that featured vehicle cards load.
3. In the homepage quick search, choose a make, body type, and maximum price.
4. Submit the search.

Expected:

- Make choices and counts are derived from the database.
- The browser opens `/fahrzeuge` with query parameters.
- The displayed result count and cards match the selected filters.

### Test 3.2: public listing filters, sort, and pagination

On `/fahrzeuge`:

1. Filter by make, body type, fuel, and maximum price one at a time.
2. Combine at least two filters.
3. Try each visible sort option, especially price ascending/descending and
   mileage ascending/descending.
4. Use Next and Previous if more than one page is available.
5. Use Reset.
6. Copy a filtered URL into a new tab.

Expected:

- The URL query changes and survives refresh/direct navigation.
- Counts and cards change consistently.
- Sorting is stable between refreshes.
- Pagination preserves the active filters and sort.
- Reset returns to the unfiltered catalogue.

Only `available` and `reserved` vehicles are public. `draft`, `sold`, and
`archived` vehicles must not appear in the listing, detail route, similar
vehicles, or sitemap.

### Test 3.3: vehicle detail, metadata, and similar vehicles

1. Open an available vehicle from `/fahrzeuge`.
2. Verify title, price, registration, mileage, specifications, features, and
   ordered images.
3. Confirm that the Similar Vehicles section contains live catalogue records.
4. Inspect the browser tab title and page source metadata.
5. Change the slug to a nonexistent value.

Expected:

- The page content matches the selected database record.
- Metadata is vehicle-specific.
- Similar vehicles link to valid vehicle pages.
- A nonexistent or non-public slug returns the not-found experience.

### Test 3.4: sitemap

Open `/sitemap.xml`.

Expected:

- Public static routes are present.
- Available/reserved vehicle detail URLs are present.
- Draft, sold, and archived vehicle URLs are absent.

### Test 3.5: admin inventory reads

On `/admin/vehicles`:

1. Search by make, model, stock number, and VIN last six.
2. Filter through all statuses.
3. Sort Vehicle, Price, Mileage, Status, and Updated columns.
4. Test pagination.

Expected:

- Each control changes the URL query and SQL result.
- Refreshing or sharing the URL preserves the view.
- Admin sees every lifecycle state, including records hidden publicly.

## 9. Phase 4 — vehicle commands and media

### Test 4.1: create a vehicle

Open `/admin/vehicles/new` and create a dedicated record. Example values:

| Field              | Example                                                |
| ------------------ | ------------------------------------------------------ |
| Make               | `QA Motors`                                            |
| Model              | `Phase Five`                                           |
| Variant            | `Backend Test`                                         |
| Stock number       | `QA-20260927-01`                                       |
| Slug               | `qa-phase-five-20260927-01`                            |
| Description        | `Dedicated vehicle for backend functional testing.`    |
| Price              | `25000`                                                |
| First registration | `2025-01`                                              |
| Mileage            | `12345`                                                |
| Power              | `110`                                                  |
| VIN last six       | `TST927`                                               |
| Exterior color     | `Blue`                                                 |
| Owners             | `1`                                                    |
| Features           | `Navigation` on one line and `Heated seats` on another |
| Status             | `draft`                                                |

Expected:

- `Save draft` creates a draft regardless of the selected status.
- `Create vehicle` saves the selected status when valid.
- The browser returns to `/admin/vehicles` and shows a success toast.
- The row is searchable by its stock number.
- Reusing the same slug or stock number produces a clear conflict/field error
  and does not create a duplicate.

### Test 4.2: edit and public visibility

1. Open the QA vehicle's action menu and choose Edit.
2. Change its price, mileage, description, and featured flag.
3. Set the status to `available` and update it.
4. Open its public page from the row action menu.

Expected:

- All edits persist after refresh.
- Once available, the vehicle appears on `/fahrzeuge` and its detail route.
- If featured, it can appear in the homepage featured section.

### Test 4.3: lifecycle and duplicate commands

1. Duplicate the QA vehicle from its row action menu.
2. Search for the duplicated row.
3. Verify that the copy is a draft with unique identifiers.
4. Exercise supported transitions through edit or row actions:
   - draft → available or archived;
   - available → draft, reserved, sold, or archived;
   - reserved → available, sold, or archived;
   - sold → available or archived;
   - archived → draft or available.
5. Select compatible rows and test bulk Archive or Mark sold.

Expected:

- Duplicate creates a new draft without overwriting the source.
- Allowed transitions persist and update public visibility immediately.
- Unsupported transitions are rejected by the server even if attempted with a
  stale page or crafted request.
- Bulk commands are atomic from the user's perspective and report conflicts
  clearly.

### Test 4.4: UploadThing media library

On `/admin/media`:

1. Upload one small JPG, PNG, or WebP created specifically for QA.
2. Upload two or three images together.
3. Try more than 10 images in one selection.
4. Try an image larger than 8 MB.
5. Search by the uploaded filename or generated title.
6. Filter Usage to `Unused` and Type to `Image`.
7. Open Details, copy the URL, and open/download the asset.
8. Select the QA upload, choose Delete, confirm permanent deletion, and verify
   that it disappears after refresh.
9. Select an imported vehicle-linked image.

Expected:

- Valid uploads reach UploadThing and immediately create database-backed media
  records.
- Upload success and failure are reported with toasts.
- Maximum file count and size are enforced.
- Search, filters, details, and pagination are database-backed.
- Deleting an unused UploadThing asset removes it from both UploadThing and the
  database and creates an activity event.
- A vehicle-linked image cannot be deleted until detached; the Delete action is
  disabled or the server rejects it.

Important scope boundary: the standalone Media library is real, but attaching a
new asset to a vehicle and reordering/removing images inside the vehicle edit
form are still UI-only. The vehicle form labels that panel as mock and displays
informational toasts for those actions.

## 10. Phase 5 — leads and appointments

### Test 5.1: public contact lead submission

1. In the anonymous window, open `/kontakt`.
2. Submit once without consent or with other invalid fields.
3. Complete all required fields, select an appointment type, choose today or a
   future preferred date, accept consent, and submit.
4. Record the exact customer email and name.

Expected:

- Invalid input stays on the form and shows field errors.
- A past preferred date is rejected.
- Valid input shows the success state and creates one Lead plus one activity
  event.
- No Appointment is created automatically. The appointment type and preferred
  date are lead intent, not a confirmed booking.

Abuse controls to verify separately with disposable test emails:

- An identical submission within 60 seconds is rejected as a duplicate.
- The fourth submission from the same email inside the configured 15-minute
  window is rate-limited.
- The hidden `website` honeypot must stay empty; a filled honeypot is rejected.

### Test 5.2: public vehicle valuation submission

1. Open `/fahrzeug-verkaufen` in the anonymous window.
2. Enter make, model, first registration, mileage, condition, accident/service
   details, contact information, and consent.
3. Submit and record the email/name.

Expected:

- Invalid mileage, registration month, missing consent, and filled honeypot are
  rejected.
- A valid request shows the success state.
- The server atomically creates one Lead, one linked ValuationRequest, and one
  activity event.
- Duplicate and rate-limit rules match the contact form.

### Test 5.3: admin leads inbox

Sign in as ADMIN and open `/admin/leads`.

1. Confirm that the contact and valuation records from Tests 5.1 and 5.2 are
   present.
2. Search by customer name and email.
3. Use the status tabs and pagination.
4. Open each lead's detail panel.
5. Verify contact data, source, priority, message, preferred date, vehicle
   interest/valuation information, and timeline.
6. Test the Email and Call links where available.
7. From one lead, choose Schedule appointment.

Expected:

- Results, counts, tabs, search, pagination, details, and timeline come from
  SQL data.
- The appointment page opens with the selected lead and pre-fills customer
  fields.

Important scope boundary: `Mark contacted`, `Close`, and `Save note` currently
show UI-only informational toasts. Lead status mutation and note creation are
not complete in Phase 5.3.

### Test 5.4: appointment creation and reads

In `/admin/appointments`, finish the form opened from the lead:

1. Keep the lead link and verify the customer data is pre-filled.
2. Optionally choose a vehicle and assigned staff member.
3. Choose a future start and end time, location, type, and notes.
4. Save the appointment.

Expected:

- The appointment is created with `requested` status.
- It appears in the selected calendar day, daily agenda, and all-appointments
  table.
- Its details show the linked lead and vehicle where selected.
- Search finds it by customer, location, or vehicle.
- Status and type filters update the result and URL.

Repeat once using the top-level Schedule appointment button with no linked lead.
This proves that lead linkage is optional.

### Test 5.5: appointment lifecycle

1. Open a requested appointment and choose Confirm.
2. Reopen it and choose Complete.
3. On a different requested appointment, choose Cancel and first try an empty
   reason, then a real reason.

Expected:

- Supported transitions are `requested → confirmed/cancelled` and
  `confirmed → completed/cancelled`.
- Completed and cancelled appointments are terminal.
- Cancellation requires a reason.
- Status timestamps and activity events are written by the server.

### Test 5.6: rescheduling and overlap protection

1. Create two requested appointments that use the same vehicle or assigned
   staff member.
2. Make the second time range overlap the first.
3. Repeat with non-overlapping times.
4. Reschedule a requested or confirmed appointment.
5. Try to reschedule a completed or cancelled appointment.

Expected:

- Overlapping active appointments for the same vehicle or staff member are
  rejected.
- Non-overlapping appointments save normally.
- Requested and confirmed appointments can be rescheduled to a future time.
- Completed and cancelled appointments cannot be rescheduled.
- Rescheduling produces an activity event.

## 11. Known limitations and documentation drift

Do not report these as newly discovered regressions during this test pass:

1. `/admin`, `/admin/users`, `/admin/activity`, and `/admin/settings` still use
   mock/UI-only data or actions. They belong to later roadmap work.
2. Lead status buttons and internal notes are UI-only, as described above.
3. Vehicle-form image upload, attachment, removal, and ordering are UI-only;
   the separate `/admin/media` UploadThing library is functional.
4. `/fahrzeugsuche` remains a legacy/local-data advanced-search page. The
   SQL-backed public catalogue delivered in Phase 3 is `/fahrzeuge` plus the
   homepage search controls.
5. Favourites and comparison still use local browser storage and local/mock
   vehicle data. They are outside Phases 1–5.
6. `docs/backend-architecture-decisions.md` still names Cloudinary, but the
   selected and implemented provider is UploadThing. The decision document
   should be updated.
7. The README's development command is stale. Use `pnpm serve`, not
   `pnpm dev`.
8. The older authentication testing guide describes admin business pages as
   mock/static. Its authentication scenarios remain useful, but that statement
   is superseded for Vehicles, Media, Leads, and Appointments by this guide.

## 12. Final acceptance checklist

Mark Phase 1–5 functional QA complete only when all applicable items pass:

- [ ] Anonymous users are redirected away from every admin route.
- [ ] Non-admin accounts cannot read or mutate admin data.
- [ ] The database schema is valid and all migrations are applied.
- [ ] Homepage featured vehicles and facets come from SQL.
- [ ] `/fahrzeuge` filtering, sorting, pagination, and URL state work.
- [ ] Vehicle detail, similar vehicles, metadata, and sitemap are correct.
- [ ] Admin inventory search, filters, sort, and pagination work.
- [ ] Vehicle create, update, duplicate, lifecycle, and bulk commands work.
- [ ] Public visibility follows vehicle status.
- [ ] UploadThing uploads and unused-asset deletion work.
- [ ] Public contact submission creates a lead and audit event.
- [ ] Public valuation creates a lead, valuation record, and audit event.
- [ ] Admin Leads shows both public submissions correctly.
- [ ] Lead-to-appointment prefill works.
- [ ] Appointment create, search, filters, calendar, and pagination work.
- [ ] Appointment confirm, complete, cancel, and reschedule rules work.
- [ ] Appointment overlap protection works for vehicles and staff.
- [ ] No unexpected server error appears in the terminal or browser console.
- [ ] Automated TypeScript, test-runner, build, and formatting blockers are
      resolved before release approval.

When reporting a failure, include the route, test number from this guide,
account role, exact input, expected result, actual result, browser console
message, and server-terminal error. Never include secrets or full customer data
in screenshots.
