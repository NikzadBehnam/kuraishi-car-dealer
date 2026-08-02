# Kuraishi car dealer

Production-oriented Phase 1 user interface for a German dealership and vehicle marketplace. The application uses local typed demo data and browser storage; it deliberately does not simulate production authentication, inventory, financing approval, payments, email delivery, or booking infrastructure.

## Technology stack

- Next.js App Router and React: server-first routing, metadata, loading and error boundaries
- TypeScript strict mode: domain and component safety
- Tailwind CSS v4: token-driven responsive styling
- shadcn/ui conventions with Radix primitives: accessible, customizable UI foundations
- Motion for React: available for focused client animations and reduced-motion-aware transitions
- React Hook Form, Zod and resolvers: typed forms and German validation messages
- Lucide React: tree-shakeable accessible icons
- Sonner: transient German action notifications
- Vitest: useful unit tests for business utilities

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm typecheck
pnpm format
pnpm format:check
pnpm test
```

## Architecture

- `src/app`: German public route segments, Server Component pages, metadata, loading and error boundaries
- `src/components`: reusable English-named layout, UI, search, vehicle, form and provider components
- `src/config`: site identity, routes, navigation and motion configuration
- `src/content/de`: centralized German visible copy
- `src/data`: local vehicles and dealers
- `src/types`: backend-ready domain contracts
- `src/schemas`: Zod validation schemas with German messages
- `src/lib`: formatting, filtering and shared utilities

Server Components are the default. Client Components are limited to filters, local favourites/comparison state, mobile navigation, calculators, forms and notifications.

The localized App Router strategy is documented in [`docs/routing-architecture.md`](docs/routing-architecture.md).

## Customization

- Brand colors, radii, shadows and layout tokens: `src/app/globals.css`
- Fonts: `src/app/layout.tsx` (`next/font`) and the font variables in `globals.css`
- Dealership identity and contact details: `src/config/site.config.ts`
- German content: `src/content/de`
- Vehicle data: `src/data/vehicles.ts`
- Dealer data: `src/data/dealers.ts`
- Motion settings: `src/config/animation.config.ts`

## Search and local state

Filtering is implemented in `src/lib/vehicle-filters.ts`, independent of the visual components, so it can be moved to an API or database query later. Initial filters are parsed from URL search parameters. Favourites and comparison selections use a focused React provider and browser `localStorage`; a production account service can replace this persistence boundary.

## Forms and future integrations

Forms use schemas from `src/schemas`. Submission currently waits briefly and returns an explicit UI-only success state. Replace those submit handlers with server actions or API clients for CRM, booking, email, inventory and financing services. Vehicle and dealer types are intentionally suitable for API mapping.

## Legal notice

All legal pages are clearly marked placeholders. They must be reviewed and replaced by qualified legal counsel before production deployment.
