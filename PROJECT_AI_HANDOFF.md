# Kuraishi Car Dealer - AI Agent Project Handoff

This document is a source-grounded technical overview of the project as of the current workspace state. It is intended to be pasted or attached as context for another AI coding agent.

## 1. Project Purpose

Kuraishi Car Dealer is a Next.js App Router application for a German-language car dealership / vehicle marketplace. It currently implements a production-oriented UI prototype with typed local demo data, German public pages, vehicle browsing, favourites/comparison state in the browser, UI-only forms, auth screens, and an admin back office prototype.

Important boundary: there is no real backend yet. Authentication, sessions, database persistence, CRM/email delivery, media uploads, booking, inventory mutations, and account services are not implemented. Most submit/action handlers show Sonner toasts and intentionally remain UI-only.

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

Verified in this workspace: `pnpm test` passes 5 tests across route config, formatters, and vehicle filters.

## 3. Top-Level Files

- `package.json`: dependencies and scripts.
- `pnpm-lock.yaml`: dependency lockfile.
- `pnpm-workspace.yaml`: pnpm build settings for native dependencies such as `sharp`.
- `next.config.ts`: Next image remote pattern for Unsplash.
- `tsconfig.json`: strict TypeScript, App Router settings, `@/*` alias to `src/*`.
- `eslint.config.mjs`: Next core web vitals + TypeScript ESLint config, ignores `.next`, `dist`, `outputs`, `work`.
- `postcss.config.mjs`: Tailwind v4 PostCSS plugin.
- `components.json`: shadcn config, aliases, `new-york` style, Lucide icon library.
- `README.md`: high-level project overview. Note: some README text is stale; it says Vitest and says no admin/auth layouts exist, but the current code uses Node tests and includes `(auth)` plus `(protected)/admin`.
- `docs/routing-architecture.md`: localized routing design. Also partially stale regarding future protected architecture because admin/auth code now exists.
- `PROJECT_AI_HANDOFF.md`: this handoff document.

## 4. Source Structure

Main directories:

- `src/app`: App Router routes, layouts, loading/error/not-found files, metadata, sitemap, robots.
- `src/components`: shared UI, layout, admin layout, vehicle cards/actions, providers, theme, motion helpers.
- `src/config`: site identity, route contracts, navigation, admin routes, animation constants.
- `src/content/de`: centralized German visible copy.
- `src/data`: typed local demo data for vehicles, dealers, and admin mock records.
- `src/lib`: pure utilities such as filtering, formatting, metadata, route matching, class merging.
- `src/types`: domain contracts for vehicles, dealers, and admin entities.
- `public/images`: brand assets and vehicle type images.

## 5. Routing Architecture

The project uses English physical route folders and German public canonical URLs. Route groups do not add URL segments.

Route contracts live in `src/config/routes.config.ts`:

Public canonical URLs:

- `/` -> home
- `/fahrzeuge` -> vehicle listing
- `/fahrzeuge/[slug]` -> vehicle detail via route builder
- `/fahrzeugsuche` -> advanced search
- `/merkliste` -> favourites
- `/fahrzeugvergleich` -> comparison
- `/fahrzeug-verkaufen` -> sell/valuation flow
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
- `/vehicle-search`
- `/favourites`
- `/vehicle-comparison`
- `/sell-vehicle`
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
- Excludes API routes, Next static/image routes, favicon, images/fonts/assets, and file-extension paths.

Do not link to `internalRoutes` from user-facing UI. Public links should use `publicRoutes`, `routes`, or `routeBuilders`.

Admin/auth routes are direct and not localized:

- `/login`
- `/register`
- `/admin`
- `/admin/vehicles`
- `/admin/vehicles/new`
- `/admin/vehicles/[id]/edit`
- `/admin/leads`
- `/admin/appointments`
- `/admin/users`
- `/admin/activity`
- `/admin/media`
- `/admin/settings`

There is no middleware/auth guard protecting `/admin`; the `(protected)` route-group name is organizational only.

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

- `src/app/(public)/(marketplace)/layout.tsx`: adds a horizontal marketplace nav for all vehicles, advanced search, favourites, and comparison.
- Marketplace has its own loading/error boundaries plus listing/detail specific loading/error/not-found files.

Legal layout:

- `src/app/(public)/(legal)/layout.tsx`: semantic wrapper for legal information.
- `src/app/(public)/(legal)/error.tsx`: legal-subtree recovery.

Auth layout:

- `src/app/(auth)/layout.tsx`: no shell, sets non-indexing metadata.
- `src/app/(auth)/_components`: auth shell/field primitives.
- Login/register forms are client-side and UI-only.

Admin layout:

- `src/app/(protected)/admin/layout.tsx`: sets title `Admin`, `robots: noindex`, wraps content in `AdminShell`.
- `src/components/admin/layout/admin-shell.tsx`: top bar, sidebar, breadcrumbs, responsive admin grid.
- Admin-specific not-found, loading, and error files exist under the admin route tree.

## 7. Public Route Responsibilities

Marketing:

- `src/app/(public)/(marketing)/page.tsx`: home page. Uses hero video, quick search, vehicle discovery search, featured vehicles, benefits, and valuation CTA.
- `src/app/(public)/(marketing)/about-us/page.tsx`: about page with stats and showroom image.
- `src/app/(public)/(marketing)/services/page.tsx`: service cards for trade-in, purchase, warranty, insurance, registration, workshop.
- `src/app/(public)/(marketing)/contact/page.tsx`: contact form plus dealer contact panel using `siteConfig`.

Marketplace:

- `src/app/(public)/(marketplace)/vehicles/page.tsx`: vehicle listing. Parses `searchParams` for make, model, body type, fuel type, location, maximum price. Passes local vehicles to `VehicleSearchResults`.
- `src/app/(public)/(marketplace)/vehicles/[slug]/page.tsx`: vehicle detail. Static params are generated from local `vehicles`. Missing slug calls `notFound()`. Shows gallery, facts, features, description, dealer contact card, actions, similar vehicles, and mobile sticky CTA.
- `src/app/(public)/(marketplace)/vehicle-search/page.tsx`: advanced search UI stub with many select fields. The fields are not wired to filtering yet; CTA links to `/fahrzeuge`.
- `src/app/(public)/(marketplace)/favourites/page.tsx`: reads browser-local favourites through `FavouritesGrid`.
- `src/app/(public)/(marketplace)/vehicle-comparison/page.tsx`: reads browser-local comparison selections through `ComparisonTable`.
- `src/app/(public)/(marketplace)/sell-vehicle/page.tsx`: vehicle valuation form and benefit panel.

Legal:

- `src/app/(public)/(legal)/imprint/page.tsx`
- `src/app/(public)/(legal)/privacy/page.tsx`
- `src/app/(public)/(legal)/terms/page.tsx`
- `src/app/(public)/(legal)/cookie-settings/page.tsx`

All legal pages use `LegalPage` and placeholder copy from `src/content/de/legal-pages.ts`; they must be replaced before production.

Auth:

- `src/app/(auth)/login/page.tsx`: `AuthShell` + `LoginForm`.
- `src/app/(auth)/register/page.tsx`: `AuthShell` + `RegisterForm`.
- Login/register schemas are in `src/app/(auth)/_schemas/auth.schema.ts`.

Admin:

- `src/app/(protected)/admin/page.tsx`: dashboard overview.
- `src/app/(protected)/admin/vehicles/page.tsx`: inventory table.
- `src/app/(protected)/admin/vehicles/new/page.tsx`: create vehicle form.
- `src/app/(protected)/admin/vehicles/[id]/edit/page.tsx`: edit vehicle form; unknown id calls `notFound()`.
- `src/app/(protected)/admin/leads/page.tsx`: leads inbox.
- `src/app/(protected)/admin/appointments/page.tsx`: appointments board.
- `src/app/(protected)/admin/users/page.tsx`: user management.
- `src/app/(protected)/admin/activity/page.tsx`: audit/activity explorer.
- `src/app/(protected)/admin/media/page.tsx`: media library.
- `src/app/(protected)/admin/settings/page.tsx`: UI settings panel.

## 8. Data Model and Mock Data

Vehicle contract: `src/types/vehicle.ts`

- `FuelType`: `petrol | diesel | electric | hybrid`
- `TransmissionType`: `automatic | manual`
- `BodyType`: `suv | compact | sedan | wagon | van | sports`
- `Vehicle`: id, slug, make/model/variant, price, firstRegistration, mileage, fuel/transmission/body, power, exteriorColor, consumption/co2, condition, features, description, images, dealerId, location, featured/available flags, labels.

Dealer contract: `src/types/dealer.ts`

- `Dealer`: id, name, rating, review count, phone, email, address, opening hours.

Public mock data:

- `src/data/vehicles.ts`: 24 generated vehicle records based on a tuple list. Images are Unsplash URLs. Slugs are lowercased make/model/index with spaces replaced by hyphens. First 6 vehicles are featured.
- `src/data/dealers.ts`: one dealer record, `kuraishi-wien`.

Admin contract: `src/types/admin.ts`

- Extends vehicles into `AdminVehicle` with stock number, status, inspection status, acquisition/published/reserved/sold timestamps, updater, VIN ending, owner count, views, inquiries, favourites, margin estimate.
- Defines leads, appointments, users, activity events, media assets, and stats.

Admin mock data:

- `src/data/admin/index.ts`: derives `adminVehicles` from public `vehicles`, then defines `adminUsers`, `adminLeads`, `adminAppointments`, `adminActivityEvents`, `adminMediaAssets`, and `adminStats`.
- Admin dates are static 2026 demo timestamps.

## 9. State and Business Logic

Vehicle filtering:

- `src/lib/vehicle-filters.ts` exports `VehicleFilters` and `filterVehicles`.
- Supports make, model, bodyType, fuelType, location substring, maximumPrice.
- Sort modes: `price-asc`, `price-desc`, `newest`; default sorts featured vehicles first.
- Uses `toSorted`, so it does not mutate the source array.

Formatting:

- `src/lib/formatters.ts`: German currency, mileage, power, registration, fuel, transmission, body type labels.

Route helpers:

- `src/lib/route-matching.ts`: exact/nested route checks, vehicle details route detection, account/admin route checks.
- `src/lib/metadata.ts`: `createPublicMetadata(title, description, publicPath)` for canonical and Open Graph public metadata.

Browser state:

- `src/components/providers/vehicle-state-provider.tsx`: client context storing `favourites` and `comparison` as Sets.
- Persistence keys:
  - `kuraishi-favourites`
  - `kuraishi-comparison`
- Comparison limit is 3 vehicles.
- Mutations write to `localStorage` and show German toasts.
- Provider is mounted globally in `src/app/layout.tsx`, so public header and vehicle actions can use it.

## 10. Forms and Validation

All forms are client-side UI prototypes.

- Contact form:
  - Schema: `src/app/(public)/(marketing)/contact/_schemas/contact-form.schema.ts`
  - Component: `src/app/(public)/(marketing)/contact/_components/contact-form.tsx`
  - Fields include name, email, phone, appointment type, preferred date, message, consent.

- Vehicle valuation form:
  - Schema: `src/app/(public)/(marketplace)/sell-vehicle/_schemas/vehicle-valuation.schema.ts`
  - Component: `src/app/(public)/(marketplace)/sell-vehicle/_components/vehicle-valuation-form.tsx`
  - Fields include make, model, first registration, mileage, optional email.

- Auth forms:
  - Schema: `src/app/(auth)/_schemas/auth.schema.ts`
  - Components: login/register forms.
  - Messages are English; other public validation is German.

- Admin vehicle form:
  - Schema: `src/app/(protected)/admin/vehicles/_schemas/vehicle-form.schema.ts`
  - Component: `src/app/(protected)/admin/vehicles/_components/vehicle-form.tsx`
  - Handles create/edit UI for public + admin vehicle fields.

## 11. Component Inventory

Shared layout:

- `src/components/layout/site-header.tsx`: sticky glass header, desktop/mobile nav, theme toggle, favourites count.
- `src/components/layout/site-footer.tsx`: newsletter, contact links, legal links, social icons, QR code.
- `src/components/layout/page-header.tsx`: common page header/breadcrumb.
- `src/components/layout/newsletter-form.tsx`: UI-only newsletter signup toast.
- `src/components/layout/dealership-qr-code.tsx`: client QR code component.

Vehicle components:

- `src/components/vehicle/vehicle-card.tsx`: public vehicle card linking to canonical detail route.
- `src/components/vehicle/vehicle-actions.tsx`: favourite/compare buttons using `useVehicleState`.
- `src/components/vehicle/vehicle-card-skeleton.tsx`: loading placeholder.
- `src/app/(public)/(marketplace)/vehicles/_components/vehicle-filter-bar.tsx`: listing filters.
- `src/app/(public)/(marketplace)/vehicles/_components/vehicle-search-results.tsx`: filtered results.
- `src/app/(public)/(marketplace)/vehicles/[slug]/_components/vehicle-image-gallery.tsx`: detail gallery.
- `src/app/(public)/(marketplace)/favourites/_components/favourites-grid.tsx`: saved vehicles grid.
- `src/app/(public)/(marketplace)/vehicle-comparison/_components/vehicle-comparison-table.tsx`: comparison table.

Marketing components:

- `src/app/(public)/(marketing)/_components/quick-search-form.tsx`: compact hero search.
- `src/app/(public)/(marketing)/_components/vehicle-discovery-search.tsx`: interactive discovery/category search.

Admin components:

- `src/components/admin/layout/*`: shell, top bar, sidebar, breadcrumbs.
- `src/app/(protected)/admin/_components/dashboard-overview.tsx`: dashboard metrics and panels.
- `src/app/(protected)/admin/vehicles/_components/vehicle-inventory-table.tsx`: inventory list with search/sort/status filter, selection, UI-only actions.
- `src/app/(protected)/admin/vehicles/_components/vehicle-form.tsx`: create/edit form.
- `src/app/(protected)/admin/leads/_components/leads-inbox.tsx`: lead filtering, selection, detail panel, UI-only actions.
- `src/app/(protected)/admin/appointments/_components/appointments-board.tsx`: appointment board/detail interactions.
- `src/app/(protected)/admin/users/_components/users-management.tsx`: user table/details/actions.
- `src/app/(protected)/admin/activity/_components/activity-audit.tsx`: audit log filters/detail.
- `src/app/(protected)/admin/media/_components/media-library.tsx`: media filtering/detail/upload placeholders.
- `src/app/(protected)/admin/settings/_components/settings-panel.tsx`: UI settings panels/actions.

Design system:

- `src/components/ui/*`: Button, Card, Input, Label, Textarea, Select, Checkbox, Switch, Dialog, Dropdown, Popover, Sheet, Tabs, Table, Tooltip, Avatar, Badge, Calendar, DatePicker, MonthPicker, ScrollArea, Separator, Skeleton.
- `src/components/brand-logo.tsx`, `src/components/theme-provider.tsx`, `src/components/theme-toggle.tsx`, `src/components/motion/animated-section.tsx`, and `src/components/shared/*` support the common UI.

## 12. Configuration Details

Site identity:

- `src/config/site.config.ts`: name, shortName, tagline, description, public URL, map URL, contact, address, opening hours, social URLs.

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

Current tests:

- `src/config/routes.config.test.ts`: checks German public vs English internal route config and vehicle route builder.
- `src/lib/formatters.test.ts`: checks German formatting for currency, mileage, registration.
- `src/lib/vehicle-filters.test.ts`: checks filtering/sorting without source mutation and homepage make/model/location filtering.

Recommended validation commands before/after code changes:

- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`

## 16. Current Implementation Gaps / Warnings

- No real authentication, authorization, sessions, or role checks. `/admin` is only a UI route.
- No database or API route handlers.
- No server actions for form submissions.
- No real uploads or media storage.
- No email/CRM/booking/inventory integrations.
- Contact, valuation, auth, admin actions, settings, media upload, appointment operations, and admin vehicle save actions are UI-only toasts.
- Legal pages are placeholders and must be replaced before production.
- README and routing documentation are partially outdated relative to current admin/auth implementation.
- Advanced vehicle search page is mostly static select UI; the real filtering happens on `/fahrzeuge` and homepage discovery/search components.
- Browser local state is anonymous per device and stored in `localStorage`, not tied to users.

## 17. Guidance for Future Agents

When adding public routes:

1. Add or update the English physical App Router page.
2. Add German canonical path to `publicRoutes`.
3. Add English internal path to `internalRoutes`.
4. Use `publicRoutes` or `routeBuilders` for all UI links and metadata.
5. Update sitemap behavior if the route should be indexable.
6. Verify German rewrite and English redirect.

When adding backend behavior:

1. Keep existing typed contracts in `src/types` as mapping boundaries.
2. Replace local `src/data` imports in route wrappers with server-side data access.
3. Replace UI-only submit handlers with server actions or API clients.
4. Add real auth/role checks for `/admin`; do not rely on route groups, robots, or proxy rules.
5. Keep public canonical routes German unless product requirements change.

When modifying UI:

1. Prefer existing `src/components/ui` primitives and local patterns.
2. Keep German visible copy in `src/content/de` when it is shared or reusable.
3. Keep route-local components inside route `_components` until they are truly reused.
4. Reuse `formatters`, `filterVehicles`, `routeBuilders`, `siteConfig`, and admin route config rather than hardcoding.
