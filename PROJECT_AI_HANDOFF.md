# Kuraishi Car Dealer - AI Agent Project Handoff

This document summarizes the implemented project architecture. For active section status, safety gates, and retest instructions, use the [checklist](Notes/Checklist.md) and [full test guide](Notes/Implemented-Sections-Test-Guide.md); they take precedence over this overview.

## 1. Project Purpose

Kuraishi Car Dealer is a Next.js App Router application for a German-language dealership and vehicle marketplace. The public catalog and protected staff workspace use database-backed vehicle and business records; comparison selection remains anonymous browser state.

Better Auth provides staff email/password sign-in with persisted sessions. The admin layout and each server-side data operation validate sessions; only the master admin may create accounts. Prisma/Neon support persisted inventory, dealership settings, inquiries and notes, dashboard metrics, and media workflows. Inquiry notification delivery is gated and is not enabled for Production. Customer accounts, self-service password reset, confirmed booking/slot management, CRM integration, and vehicle-view tracking are not implemented.

## 2. Stack and Tooling

- Framework: Next.js App Router with React and TypeScript.
- Styling: Tailwind CSS v4 through `@tailwindcss/postcss`, CSS variables in `src/app/globals.css`.
- UI conventions: shadcn/ui-style components under `src/components/ui`, Radix primitives, `class-variance-authority`, `tailwind-merge`.
- Icons: `lucide-react`.
- Forms: `react-hook-form`, `@hookform/resolvers`, `zod`.
- Theme: `next-themes` with light/dark CSS tokens.
- Toasts: `sonner`.
- Animations: `motion` package is installed; local `AnimatedSection` and CSS keyframes are used.
- Images: Next Image allows `https://images.unsplash.com` via `next.config.ts`.
- Tests: Node built-in test runner with `--experimental-strip-types`.
- Package manager: pnpm.

Scripts in `package.json`:

- `pnpm serve`: `next dev`
- `pnpm build`: production build
- `pnpm start`: `next start`
- `pnpm lint`: ESLint with max warnings 0
- `pnpm typecheck`: `tsc --noEmit`
- `pnpm format` / `pnpm format:check`: Prettier
- `pnpm test` / `pnpm test:watch`: Node tests over `src/**/*.test.ts`

Run `pnpm test` for source tests. The inventory and media database suites use isolated environment files, apply migrations, and must not run until their documented safety gates are satisfied.

## 3. Top-Level Files

- `package.json`: dependencies and scripts.
- `pnpm-lock.yaml`: dependency lockfile.
- `pnpm-workspace.yaml`: pnpm build settings for native dependencies such as `sharp`.
- `next.config.ts`: Next image remote pattern for Unsplash.
- `tsconfig.json`: strict TypeScript, App Router settings, `@/*` alias to `src/*`.
- `eslint.config.mjs`: Next core web vitals + TypeScript ESLint config, ignores `.next`, `dist`, `outputs`, `work`.
- `postcss.config.mjs`: Tailwind v4 PostCSS plugin.
- `components.json`: shadcn config, aliases, `new-york` style, Lucide icon library.
- `README.md`: high-level project overview.
- `Notes/Checklist.md` and `Notes/Implemented-Sections-Test-Guide.md`: active implementation status and retest guidance.
- `PROJECT_AI_HANDOFF.md`: this handoff document.

## 4. Source Structure

Main directories:

- `src/app`: App Router routes, layouts, loading/error/not-found files, metadata, sitemap, robots.
- `src/components`: shared UI, layout, admin layout, vehicle cards/actions, providers, theme, motion helpers.
- `src/config`: site identity, route contracts, navigation, admin routes, animation constants.
- `src/content/de`: centralized German visible copy.
- `src/data`: legacy typed demo/fixture data; live catalog and admin records use server-side data access.
- `src/lib`: server-only Prisma/auth/business operations alongside shared filtering, formatting, metadata, and route utilities.
- `src/types`: domain contracts for vehicles, dealers, and admin entities.
- `public/images`: brand assets and vehicle type images.

## 5. Routing Architecture

The project uses English physical route folders and German public canonical URLs. Route groups do not add URL segments.

Route contracts live in `src/config/routes.config.ts`:

Public canonical URLs:

- `/` -> home
- `/fahrzeuge` -> vehicle listing
- `/fahrzeuge/[slug]` -> vehicle detail via route builder
- `/fahrzeugvergleich` -> comparison
- `/services` -> services
- `/ueber-uns` -> about
- `/kontakt` -> contact
- `/impressum` -> imprint
- `/datenschutz` -> privacy
- `/agb` -> terms
- `/cookie-einstellungen` -> cookie settings

Internal physical routes:

- `/vehicles`
- `/vehicles/[slug]`
- `/vehicle-comparison`
- `/about-us`
- `/contact`
- `/imprint`
- `/privacy`
- `/terms`
- `/cookie-settings`

`src/proxy.ts` performs localization:

- Rewrites German public routes to English internal route files.
- Redirects direct English internal public-route requests back to German canonical URLs with 308.
- Preserves vehicle slugs and query strings by cloning `request.nextUrl`.
- Excludes API routes, Next static/image routes, favicon, images/fonts/assets, and file-extension paths, except explicit vehicle-route matchers so dotted slugs such as `volkswagen-id.4-17` are localized correctly.

Do not link to `internalRoutes` from user-facing UI. Public links should use `publicRoutes`, `routes`, or `routeBuilders`.

Admin/auth routes are direct and not localized:

- `/login`
- `/admin`
- `/admin/vehicles`
- `/admin/vehicles/new`
- `/admin/vehicles/[id]/edit`
- `/admin/leads`
- `/admin/media`
- `/admin/settings`
- `/admin/accounts/new` (master admin only)

`src/app/(protected)/admin/layout.tsx` validates the Better Auth session on the server before rendering the admin shell. Data operations and server actions enforce their own session or admin boundary; the route-group name alone is not the security control.

## 6. App Layouts and Boundaries

Root app files:

- `src/app/layout.tsx`: sets `lang="de"`, JetBrains Mono font variable, global metadata, global CSS, `ThemeProvider`, `VehicleStateProvider`, and Sonner `Toaster`.
- `src/app/globals.css`: all design tokens, Tailwind theme mapping, global typography/helpers, hero/footer/admin animations, light/dark variables.
- `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/not-found.tsx`, `src/app/loading.tsx`: root-level fallbacks.
- `src/app/sitemap.ts`: emits all public routes plus all vehicle detail routes.
- `src/app/robots.ts`: allows root, disallows `/api/`, `/admin/`, `/konto/`, filtered vehicle listing query URLs, and internal English public routes.

Public layout:

- `src/app/(public)/layout.tsx`: wraps public routes with `SiteHeader`, `<main id="main-content">`, and `SiteFooter`.
- `src/app/(public)/error.tsx`: public-subtree recoverable error UI.

Marketplace layout:

- `src/app/(public)/(marketplace)/layout.tsx`: adds a horizontal marketplace nav for all vehicles and comparison.
- Marketplace has its own loading/error boundaries plus listing/detail specific loading/error/not-found files.

Legal layout:

- `src/app/(public)/(legal)/layout.tsx`: semantic wrapper for legal information.
- `src/app/(public)/(legal)/error.tsx`: legal-subtree recovery.

Auth layout:

- `src/app/(auth)/layout.tsx`: no shell, sets non-indexing metadata.
- `src/app/(auth)/_components`: auth shell/field primitives.
- `/login` signs in through Better Auth. Public registration and self-service password reset are not offered.

Admin layout:

- `src/app/(protected)/admin/layout.tsx`: sets title `Admin`, `robots: noindex`, wraps content in `AdminShell`.
- `src/components/admin/layout/admin-shell.tsx`: top bar, sidebar, breadcrumbs, responsive admin grid.
- Admin-specific not-found, loading, and error files exist under the admin route tree.

## 7. Public Route Responsibilities

Marketing:

- `src/app/(public)/(marketing)/page.tsx`: home page. Uses hero video, featured vehicles, and benefits.
- `src/app/(public)/(marketing)/about-us/page.tsx`: about page with stats and showroom image.
- `src/app/(public)/(marketing)/services/page.tsx`: service cards for trade-in, purchase, warranty, insurance, registration, workshop.
- `src/app/(public)/(marketing)/contact/page.tsx`: inquiry form plus dealer contact panel using `siteConfig`; inquiry acceptance is handled server-side.

Marketplace:

- `src/app/(public)/(marketplace)/vehicles/page.tsx`: database-backed vehicle listing with bounded keyword search and URL state.
- `src/app/(public)/(marketplace)/vehicles/[slug]/page.tsx`: database-backed eligible vehicle detail; missing or nonpublic vehicles call `notFound()`. The side column contains the breadcrumb, title, variant, availability, location, price, and dealer contact/actions. It appears before the gallery on mobile. Equipment and description share a divided panel with a responsive equipment list. Also shows facts, similar vehicles, and mobile sticky CTA.
- `src/app/(public)/(marketplace)/vehicle-comparison/page.tsx`: reads browser-local comparison selections through `ComparisonTable`.

Legal:

- `src/app/(public)/(legal)/imprint/page.tsx`
- `src/app/(public)/(legal)/privacy/page.tsx`
- `src/app/(public)/(legal)/terms/page.tsx`
- `src/app/(public)/(legal)/cookie-settings/page.tsx`

All legal pages use `LegalPage` and placeholder copy from `src/content/de/legal-pages.ts`; they must be replaced before production.

Auth:

- `src/app/(auth)/login/page.tsx`: `AuthShell` + Better Auth `LoginForm`.
- `src/app/(auth)/_schemas/auth.schema.ts`: login validation.
- `src/app/(protected)/admin/accounts/new`: master-admin-only staff account creation.

Admin:

- `src/app/(protected)/admin/page.tsx`: dashboard overview.
- `src/app/(protected)/admin/vehicles/page.tsx`: inventory table.
- `src/app/(protected)/admin/vehicles/new/page.tsx`: create vehicle form.
- `src/app/(protected)/admin/vehicles/[id]/edit/page.tsx`: edit vehicle form; unknown id calls `notFound()`.
- `src/app/(protected)/admin/leads/page.tsx`: leads inbox.
- `src/app/(protected)/admin/media/page.tsx`: media library.
- `src/app/(protected)/admin/settings/page.tsx`: database-backed dealership settings panel.

## 8. Data Model and Legacy Fixtures

Vehicle contract: `src/types/vehicle.ts`

- `FuelType`: `petrol | diesel | electric | hybrid`
- `TransmissionType`: `automatic | manual`
- `BodyType`: `suv | compact | sedan | wagon | van | sports`
- `Vehicle`: id, slug, make/model/variant, price, firstRegistration, mileage, fuel/transmission/body, power, exteriorColor, consumption/co2, condition, features, description, images, dealerId, location, featured/available flags, labels.

Dealer contract: `src/types/dealer.ts`

- `Dealer`: id, name, rating, review count, phone, email, address, opening hours.

Legacy/demo public fixtures:

- `src/data/vehicles.ts` and `src/data/dealers.ts` retain legacy/demo fixtures. They are not the source of truth for the live public catalog or admin inventory.

The Prisma schema in `prisma/schema.prisma` is the persistence model for Better Auth and the implemented business data. Server-side query/mutation modules map those records to typed application DTOs. Consult the schema and `src/lib` data-access modules before changing persisted fields.

`src/data/admin/index.ts` still exports a legacy `adminVehicles` fixture derived from demo vehicles. Do not use it as persisted inventory or reintroduce synthetic views, leads, or other unsupported metrics.

## 9. State and Business Logic

Vehicle filtering:

- Public catalog and admin inventory searches use bounded database queries; inspect their query modules and validation before changing search behavior.

Formatting:

- `src/lib/formatters.ts`: German currency, mileage, power, registration, fuel, transmission, body type labels.

Route helpers:

- `src/lib/route-matching.ts`: exact/nested route checks, vehicle details route detection, account/admin route checks.
- `src/lib/metadata.ts`: `createPublicMetadata(title, description, publicPath)` for canonical and Open Graph public metadata.

Browser state:

- `src/components/providers/vehicle-state-provider.tsx`: client context storing anonymous comparison selections as a Set.
- Persistence key: `kuraishi-comparison`.
- Comparison limit is 3 vehicles.
- Comparison selections write to `localStorage`; this state is not tied to staff or customer accounts.
- Provider is mounted globally in `src/app/layout.tsx`, so vehicle actions and the comparison page can use it.

## 10. Forms and Validation

Forms combine client-side validation/interaction with server-side operations where implemented. A client toast or hidden control is never proof of persistence or authorization.

- Contact form:
  - Schema: `src/app/(public)/(marketing)/contact/_schemas/contact-form.schema.ts`
  - Component: `src/app/(public)/(marketing)/contact/_components/contact-form.tsx`
  - Validated inquiry submissions are accepted server-side with idempotency and rate-limit checks. A preferred date is a request, not a confirmed appointment.

- Auth forms:
  - Login uses Better Auth; public sign-up and self-service password reset are disabled.
  - Staff account creation is a separate master-admin-only workflow.

- Admin vehicle form:
  - Schema: `src/app/(protected)/admin/vehicles/_schemas/vehicle-form.schema.ts`
  - Component: `src/app/(protected)/admin/vehicles/_components/vehicle-form.tsx`
  - Creates and edits persisted inventory through protected server operations.

## 11. Component Inventory

Shared layout:

- `src/components/layout/site-header.tsx`: sticky glass header, desktop/mobile nav, theme toggle.
- `src/components/layout/site-footer.tsx`: contact links, legal links, social icons, QR code.
- `src/components/layout/page-header.tsx`: compact shared page header/breadcrumb with reduced title size and vertical spacing on all consuming pages.
- `src/components/layout/dealership-qr-code.tsx`: client QR code component.

Vehicle components:

- `src/components/vehicle/vehicle-card.tsx`: public vehicle card linking to canonical detail route.
- `src/components/vehicle/vehicle-actions.tsx`: compare buttons using `useVehicleState`.
- `src/components/vehicle/vehicle-card-skeleton.tsx`: loading placeholder.
- `src/app/(public)/(marketplace)/vehicles/_components/vehicle-search-results.tsx`: compact left-aligned keyword search field, clear action, and filtered results without a vehicle-count label.
- `src/app/(public)/(marketplace)/vehicles/[slug]/_components/vehicle-image-gallery.tsx`: detail gallery.
- `src/app/(public)/(marketplace)/vehicle-comparison/_components/vehicle-comparison-table.tsx`: comparison table.

Admin components:

- `src/components/admin/layout/*`: shell, top bar, sidebar, breadcrumbs.
- `src/app/(protected)/admin/_components/dashboard-overview.tsx`: live dashboard metrics and panels; unsupported view tracking is omitted.
- `src/app/(protected)/admin/vehicles/_components/vehicle-inventory-table.tsx`: database-backed inventory list with bounded search, lifecycle actions, and selection.
- `src/app/(protected)/admin/vehicles/_components/vehicle-form.tsx`: create/edit form.
- `src/app/(protected)/admin/leads/_components/leads-inbox.tsx`: persisted inquiry inbox with notes and protected operations.
- `src/app/(protected)/admin/media/_components/media-library.tsx`: media library UI backed by server-side media/storage operations.
- `src/app/(protected)/admin/settings/_components/settings-panel.tsx`: persisted dealership and contact settings.

Design system:

- `src/components/ui/*`: Button, Card, Input, Label, Textarea, Select, Checkbox, Switch, Dialog, Dropdown, Popover, Sheet, Tabs, Table, Tooltip, Avatar, Badge, Calendar, DatePicker, ScrollArea, Separator, Skeleton.
- `src/components/brand-logo.tsx`, `src/components/theme-provider.tsx`, `src/components/theme-toggle.tsx`, `src/components/motion/animated-section.tsx`, and `src/components/shared/*` support the common UI.

## 12. Configuration Details

Site identity:

- `src/config/site.config.ts`: name, shortName, tagline, description, public URL, map URL, contact, address, opening hours, social URLs. Contact includes a primary phone and additional phones; the footer and contact QR code include all numbers.

Navigation:

- `src/config/navigation.config.ts`: main public nav item keys and hrefs.
- `src/config/admin-routes.config.ts`: admin route map, sidebar navigation, icons, descriptions, active-route helper.

Routes:

- `src/config/routes.config.ts`: German public routes, English internal routes, dynamic route builders, localized mapping list.

Animation:

- `src/config/animation.config.ts`: duration/ease/stagger constants.

Styling:

- `src/app/globals.css`: token source of truth. Notable CSS variables:
  - colors: background, foreground, surface, primary, brand-panel, secondary, accent, muted, border, input, ring, success, warning, destructive, info.
  - layout: `--container: 77.5rem`, `--header-height: 4.75rem`.
  - radii/shadows/motion tokens.
  - dark mode overrides under `.dark`.
  - helper classes: `.site-container`, `.section-space`, `.display-title`, `.page-title`, `.section-title`, `.eyebrow`, `.field`, `.control`, `.glass`.

## 13. SEO and Indexing

- Root metadata in `src/app/layout.tsx` uses `siteConfig.url`, default/template title, German locale Open Graph, and index/follow robots.
- Public pages mostly use `createPublicMetadata`.
- Vehicle details generate dynamic metadata from vehicle data.
- `sitemap.ts` includes all public route constants and every vehicle detail route.
- `robots.ts` disallows admin, API, account, filtered listing query variants, and internal English public URLs.
- Admin and auth layouts set non-indexing metadata.

## 14. Assets

Public assets:

- `public/images/brand/kuraishi-wordmark-light.png`
- `public/images/brand/kuraishi-wordmark-dark.png`
- `public/images/brand/kuraishi-full-light.png`
- `public/images/brand/kuraishi-full-dark.png`
- `public/images/vehicle-types/*.webp`: wagon, transporter, suv, sedan, minivan, coupe, convertible, compact.

Remote assets:

- Vehicle images and some page imagery are Unsplash URLs.
- Home hero video is a remote Pexels MP4 in the page markup.

## 15. Tests

Source tests live under `src/**/*.test.ts` and use Node's built-in test runner. Focused database integration suites live under `prisma/` and require their documented isolated test environment; do not point them at normal development or Production databases.

Recommended validation commands before/after code changes:

- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`

## 16. Current Implementation Gaps / Warnings

- Public staff self-registration and self-service password reset are intentionally disabled; staff accounts are created by the master admin.
- There is no customer account system, confirmed booking/slot management, or CRM integration. Inquiry date preferences are not bookings.
- Production email delivery is not enabled. Inquiry acceptance and notification outbox behavior must not be described as proof that an external email was delivered.
- Vehicle-view analytics are not implemented; do not add or surface synthetic view counts.
- Some legacy/demo fixtures remain under `src/data`; do not present them as live inventory or use them as a fallback when a database query fails.
- Legal pages are placeholders and must be replaced before production.
- Isolated database suites and combined browser retesting remain subject to the safety gates and pending items in the checklist/test guide.
- Browser comparison state is anonymous per device and stored in `localStorage`, not tied to users.

## 17. Guidance for Future Agents

When adding public routes:

1. Add or update the English physical App Router page.
2. Add German canonical path to `publicRoutes`.
3. Add English internal path to `internalRoutes`.
4. Use `publicRoutes` or `routeBuilders` for all UI links and metadata.
5. Update sitemap behavior if the route should be indexable.
6. Verify German rewrite and English redirect.

When adding backend behavior:

1. Follow existing Prisma schema, DTO adapters, validation, and server-side query/mutation modules.
2. Call `requireSession()` or `requireAdmin()` at every protected Server Action, Route Handler, and data-operation boundary; a layout guard or hidden button is not sufficient.
3. Keep public projections restricted to explicitly eligible/public data; never expose staff-only fields or private inquiry data.
4. Preserve explicit errors and prevent success-shaped fallbacks when database or provider operations fail.
5. Keep public canonical routes German unless product requirements change.

When modifying UI:

1. Prefer existing `src/components/ui` primitives and local patterns.
2. Keep German visible copy in `src/content/de` when it is shared or reusable.
3. Keep route-local components inside route `_components` until they are truly reused.
4. Reuse `formatters`, `filterVehicles`, `routeBuilders`, `siteConfig`, and admin route config rather than hardcoding.
