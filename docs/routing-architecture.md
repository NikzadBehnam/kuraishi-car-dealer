# Routing architecture

## Strategy

Kuraishi Autohandel uses a single App Router root layout and responsibility-based route groups. Every physical route segment and private folder is English. German remains limited to visible content, metadata and canonical browser URLs.

The implemented groups are:

- `(public)`: public header, main landmark and footer
- `(marketing)`: homepage, about, services and contact pages
- `(marketplace)`: marketplace subnavigation, marketplace loading state and marketplace error recovery
- `(legal)`: semantic legal-information wrapper and legal error recovery

Route groups do not add URL segments.

## Localized URLs

`src/config/routes.config.ts` defines three separate contracts:

- `publicRoutes`: German canonical browser URLs
- `internalRoutes`: English physical App Router routes
- `routeBuilders`: typed dynamic URL builders

`src/proxy.ts` rewrites German requests to English internal routes before route matching. It redirects direct requests to localized English internal paths back to their German canonical equivalents. Dynamic vehicle slugs and query strings are preserved by cloning `request.nextUrl` and changing only `pathname`.

Routes whose German and English paths are already identical, such as `/services`, pass through unchanged. Static assets, API routes and files with extensions are excluded from the Proxy matcher.

## Layout responsibilities

- `src/app/layout.tsx`: HTML, body, fonts, global CSS, application providers and toast portal only
- `src/app/(public)/layout.tsx`: public header, main landmark and footer
- `src/app/(public)/(marketplace)/layout.tsx`: marketplace-only navigation
- `src/app/(public)/(legal)/layout.tsx`: legal content landmark

No authentication, account or admin layouts exist yet because those features are not implemented.

## Boundaries

- Root `global-error.tsx`: unrecoverable application-level failures
- Public `error.tsx`: public subtree recovery and safe home navigation
- Marketplace `loading.tsx` and `error.tsx`: shared marketplace fallback and recovery
- Vehicle listing `loading.tsx` and `error.tsx`: listing-specific skeleton and recovery
- Vehicle detail `loading.tsx`, `error.tsx` and `not-found.tsx`: resource-specific states
- Legal `error.tsx`: legal subtree recovery
- Root `not-found.tsx`: all other unmatched routes

The vehicle detail page calls `notFound()` when its English internal slug does not resolve to demo data. The German browser URL remains visible because the request was rewritten rather than redirected.

## Route-local files

Files used by only one route live in `_components` or `_schemas` below that route. Shared vehicle cards, layout primitives, state providers and design-system components remain under `src/components`.

Private route folders must not be imported by unrelated routes. Promote an implementation to `src/components`, `src/lib`, `src/schemas` or `src/types` when reuse becomes real.

## Adding a public localized route

1. Create the page under the correct English physical route and route group.
2. Add its German canonical path to `publicRoutes`.
3. Add its English physical path to `internalRoutes` using the same key.
4. Use `publicRoutes` for all user-facing links and metadata.
5. Add the German public route to sitemap generation when it is indexable.
6. Add a route builder when it has dynamic segments.
7. Validate both the German rewrite and English canonical redirect, including query strings.

## Future protected architecture

When real authentication exists, add an `(auth)` group for sign-in flows and a `(protected)` group guarded by verified server-side identity. Account pages can then use an `account` nested layout, while admin pages use a separate `admin` layout and explicit role authorization. Do not rely on route groups, Proxy or robots rules as authorization controls.

API Route Handlers remain under `src/app/api` with English segments. No fake handlers, account pages or dashboards have been created.

## Avoiding duplicate URLs

Never link to `internalRoutes` from UI components. Direct English requests are canonical redirects, not separate indexable pages. Canonical metadata, Open Graph URLs, breadcrumbs and sitemap entries always use `publicRoutes` or `routeBuilders`.
