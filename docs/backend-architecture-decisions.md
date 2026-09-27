# Backend Architecture Decisions

- Status: Accepted
- Approved: 2026-09-26
- Decision owner: Kuraishi Cars project owner
- Applies to: Backend implementation roadmap Phases 1–8

This document records the product and architecture decisions that must remain
stable while the Kuraishi Cars business backend is implemented. It complements
the existing authentication and deployment documentation; it does not replace
Better Auth's schema or security rules.

If a decision changes, update this document before changing Prisma models,
validation contracts, authorization policies, or backend behavior that depends
on it.

## 1. Authorization and roles

The existing roles remain the canonical role vocabulary:

- `ADMIN` has access to all approved administrative reads and mutations.
- `STAFF` does not enter `/admin` and has no privileged business capabilities
  during the initial backend implementation.
- `CUSTOMER` has no administrative access. A customer may perform only public
  operations and authenticated operations that concern their own account.
- Anonymous visitors may read public inventory and submit approved public
  enquiry forms.

All authorization is enforced at the server boundary. Hiding or disabling a UI
control is never considered authorization. A banned user is denied protected
business operations. If Better Auth supplies multiple comma-separated roles,
the presence of `ADMIN` grants the administrative capability; `STAFF` alone
does not.

The initial capability matrix is:

| Capability | Anonymous | CUSTOMER | STAFF | ADMIN |
| --- | --- | --- | --- | --- |
| Read published public inventory | Yes | Yes | Yes | Yes |
| Submit public leads or valuation requests | Yes | Yes | Yes | Yes |
| Manage own persisted favourites/comparisons | No | Yes | Yes | Yes |
| Enter `/admin` | No | No | No | Yes |
| Manage vehicles, media, leads, or appointments | No | No | No | Yes |
| Manage users, roles, bans, audit data, or settings | No | No | No | Yes |

Expanding STAFF access requires a separate approved decision and corresponding
server policy tests. It must not be inferred from the existence of the role.

## 2. Vehicle lifecycle and public visibility

The canonical vehicle statuses are:

1. `DRAFT`
2. `AVAILABLE`
3. `RESERVED`
4. `SOLD`
5. `ARCHIVED`

`AVAILABLE` represents a published vehicle that can be sold. `RESERVED`
vehicles remain publicly visible and must be labelled as reserved. `DRAFT`,
`SOLD`, and `ARCHIVED` vehicles are not publicly visible.

Public availability is derived from lifecycle status; a separate
`isAvailable` source of truth must not be introduced. Publication,
reservation, sale, and archive timestamps may record lifecycle events, but
they do not replace the status.

The exact transition matrix and transition preconditions will be implemented
and tested in the dedicated lifecycle roadmap step. It must preserve the
visibility rules above.

## 3. Vehicle deletion

Normal operational deletion means changing the vehicle to `ARCHIVED`.
Administrative UI and ordinary business commands will not permanently delete
vehicles.

No hard-delete feature is approved. If permanent removal is later required for
data-retention or development cleanup, it must be introduced as a separate,
explicitly authorized operation with reference checks for leads, appointments,
media, favourites, comparisons, and audit history.

## 4. Vehicle media

Cloudinary is the selected image-storage and delivery provider. Application
code must access it through a provider-neutral server adapter so storage
details do not leak into vehicle domain logic.

PostgreSQL stores metadata and relationships only. Image binaries are not
stored in PostgreSQL. Vehicle images have deterministic ordering, with
position `0` representing the cover image.

The following operational parameters are intentionally deferred to the media
implementation step and do not block the contracts, schema, or read-path
phases:

- final upload byte limit;
- final MIME allowlist;
- maximum images per vehicle;
- Cloudinary delivery/custom domain;
- original-file and derived-asset retention rules.

The project owner owns those parameters and must approve them before the media
provider adapter is implemented. Until then, no upload endpoint should make
its own permanent assumptions.

## 5. Favourites and comparisons

Authenticated users receive server-persisted favourites and comparison
selections so the state can synchronize across devices.

Anonymous visitors retain the existing browser-local behavior. After a user
signs in, valid guest selections are merged into the user's persisted state
idempotently. Users may access or mutate only their own selections. The
comparison limit remains three vehicles and must be enforced transactionally
on the server.

## 6. User invitations and password resets

Administrators never select or directly set another user's password.
Administrative password-reset behavior sends the normal Better Auth reset
link.

A dedicated staff/customer invitation workflow is deferred. Customer
self-registration and the controlled first-admin seed remain the supported
account-creation paths until an invitation workflow is separately approved.

## 7. Lead and appointment notifications

Resend remains the transactional email provider for approved lead and
appointment notifications. Notification recipients are configured with
server-only environment variables rather than hardcoded in client or domain
code.

Notification delivery must not determine whether the underlying lead or
appointment transaction is committed. Delivery failures require operational
logging and a retry-safe strategy; they must not duplicate the business
record.

## 8. Dealership scope

The application models one dealership and one physical location. Vehicles do
not require a dealership/location foreign key in the initial domain schema.

Supporting multiple locations is a future product change that requires a new
architecture decision and migration.

## 9. Advanced vehicle search

Search and filtering are limited to fields supported by the approved Vehicle
model and populated inventory data. Geographic radius search and postcode
geocoding are not part of the initial backend.

Body categories, drivetrain, or other advanced filters may be exposed only
when the corresponding validated field exists and is populated. UI controls
must not claim unsupported search behavior.

## 10. Newsletter

No newsletter provider or compliance workflow is currently approved.
Newsletter persistence and delivery remain out of scope until the project
owner selects the provider and confirms double opt-in, unsubscribe, and
suppression requirements.

The existing frontend must not report a successful subscription as though a
real provider accepted it once this area is integrated.

## 11. Audit activity and retention

Operational activity events are append-only and retained for 12 months. The
retention implementation will be added with the audit feature; it is not an
authorization to delete Better Auth records or legally required records.

Activity metadata must be allowlisted and sanitized. It must never contain:

- passwords, password hashes, secrets, or authentication tokens;
- raw request bodies;
- complete session or account records;
- IP addresses or user-agent strings copied into the business activity feed;
- unnecessary customer message or contact-data snapshots.

Better Auth may continue storing its own session security fields according to
its existing schema and policy; those fields are separate from business
activity events.

## 12. Dashboard financial terminology

No Sale, Payment, or Invoice entity is approved. The dashboard must not label
asking-price totals as revenue.

Until a sale workflow is designed, supported dashboard values are limited to
accurately labelled figures such as current inventory asking value, vehicle
counts, status counts, and sold-vehicle count.

## 13. Runtime settings

Branding, appearance, legal content, social links, and dealership identity
remain code/application configuration during the initial backend
implementation. A generic database JSON settings model is not approved.

The existing admin settings UI is not authoritative persistence. If a narrow
set of dealership contact details or opening hours later needs runtime editing,
that set must receive its own schema, validation, authorization, and
concurrency decision before implementation.

## Consequences for the roadmap

- Phase 1 contracts use the lifecycle and role vocabulary defined here.
- Initial administrative policies remain ADMIN-only.
- Prisma must not add dealership, sale/payment, newsletter, invitation, or
  generic settings models without a later approved decision.
- Media metadata may be modeled independently of Cloudinary, but upload logic
  waits for approval of the deferred operational parameters.
- Public queries expose only `AVAILABLE` and `RESERVED` vehicles.
- Dashboard work uses inventory and workflow facts, not invented revenue.

