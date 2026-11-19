# Kuraishi car dealer

Next.js application for a German car dealership, with a public vehicle marketplace and a protected staff workspace. Better Auth provides staff sign-in, and Prisma/Neon back the implemented inventory, dealership settings, inquiries, and dashboard features. Some demo data and browser-local state remain; see the checklist and test guide for implementation and deployment status.

## Technology stack

- Next.js App Router and React: server-first routing, metadata, loading and error boundaries
- Better Auth, Prisma, and Neon Postgres: staff authentication and persisted business data
- TypeScript strict mode: domain and component safety
- Tailwind CSS v4: token-driven responsive styling
- shadcn/ui conventions with Radix primitives: accessible, customizable UI foundations
- Motion for React: available for focused client animations and reduced-motion-aware transitions
- React Hook Form, Zod and resolvers: typed forms and German validation messages
- Lucide React: tree-shakeable accessible icons
- Sonner: transient German action notifications
- Node.js built-in test runner: source tests run with `pnpm test`

## Commands

```bash
pnpm install
pnpm serve
pnpm build
pnpm start
pnpm lint
pnpm typecheck
pnpm format
pnpm format:check
pnpm test
```

## Architecture

- `src/app`: English physical route files localized to German public URLs, Server Component pages, metadata, loading and error boundaries
- `src/components`: reusable English-named layout, UI, search, vehicle, form and provider components
- `src/config`: site identity, routes, navigation and motion configuration
- `src/content/de`: centralized German visible copy
- `src/data`: legacy/demo vehicles and dealers; not the source of truth for live inventory
- `src/types`: domain contracts and data-transfer types
- `src/lib`: server-side data access, validation, formatting, filtering, and shared utilities

Server Components are the default. Client Components are limited to interactive filters, anonymous local comparison state, mobile navigation, forms, and notifications. Protected admin pages and server data operations validate sessions independently.

The localized route contracts are defined in `src/config/routes.config.ts`; the architecture overview is in [`PROJECT_AI_HANDOFF.md`](PROJECT_AI_HANDOFF.md).

## Customization

- Brand colors, radii, shadows and layout tokens: `src/app/globals.css`
- Fonts: `src/app/layout.tsx` (`next/font`) and the font variables in `globals.css`
- Dealership identity and contact details: `src/config/site.config.ts`
- German content: `src/content/de`
- Legacy/demo vehicle fixtures: `src/data/vehicles.ts`
- Dealer data: `src/data/dealers.ts`
- Motion settings: `src/config/animation.config.ts`

## Search and local state

The public vehicle catalog uses bounded server-side database search, and the staff workspace has a separate bounded inventory search. Comparison selections remain anonymous browser `localStorage` state and are not linked to staff or customer accounts.

## Authentication and backend boundaries

- Better Auth email/password sign-in uses persisted sessions. Public self-registration is disabled; only the master admin can create staff accounts.
- Inventory, dealership settings, inquiry intake/inbox/notes, and dashboard metrics have database-backed implementations. Media workflows also have server-side storage integrations. Migration, isolated-test, and deployment status is tracked per section in [`Notes/Checklist.md`](Notes/Checklist.md).
- Inquiry intake is guarded and configured separately from notification delivery. Email delivery is not enabled for Production, and an inquiry's preferred date is not a confirmed booking.
- Customer accounts, self-service password reset, a booking/slot system, CRM integration, and vehicle-view tracking are not implemented. Unsupported view counts are not shown.
- Legal pages remain placeholders and require qualified review before Production use.

## Legal notice

All legal pages are clearly marked placeholders. They must be reviewed and replaced by qualified legal counsel before production deployment.
