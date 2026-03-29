# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server
npm run build        # Generate Prisma client & build (prisma generate && next build)
npm run start        # Start production server
npm run lint         # Run ESLint
```

No test runner is configured.

For database schema changes:
```bash
npx prisma migrate dev   # Create and apply migration
npx prisma generate      # Regenerate Prisma client
npx prisma studio        # Open database GUI
```

## Environment Variables

Required in `.env`:
- `DATABASE_URL` — PostgreSQL connection string (Neon)
- `ENCRYPTION_KEY` — AES-256-CBC key for encrypting stored Redmine API keys/passwords
- `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk authentication
- `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` — PostHog analytics

## Architecture

**What it does:** A web app that connects to one or more Redmine instances, fetches time entries, and displays analytics dashboards (hours per week/project/date/connection).

**Routing (Next.js App Router):**
- `app/(landing)` — root page, redirects based on auth state
- `app/(auth)` — public sign-in/sign-up via Clerk
- `app/(dashboard)` — protected routes: `/dashboard` (charts + time entries table) and `/connections` (manage Redmine connections)
- `app/api/redmine/conn/` — REST API endpoints for connection CRUD, project/activity fetching, and time entry CRUD

**Data flow:**
1. Users add Redmine connections (URL + API key or username/password); credentials are AES-256-CBC encrypted before DB storage.
2. Custom hooks (`hooks/useRedmineConnectionsRequest`, `hooks/useTimeEntriesRequest`) fetch data client-side via SWR + Axios.
3. API routes decrypt credentials, call `lib/redmine.ts` (`RedmineApi` class), and return results.
4. Projects are cached in the `UserRedmineConnection.projects` JSON column to work around Vercel's 5s function timeout.

**Database:** Single Prisma model `UserRedmineConnection` (PostgreSQL via Neon). Uses soft deletes (`deleted` flag) and `@@unique([userId, url, deleted])`.

**Auth:** Clerk — `middleware.ts` protects all routes except `/`. User identity comes from `auth()` / `currentUser()` in API routes.

**UI stack:** Shadcn UI (Radix primitives) + Tailwind CSS. Forms use React Hook Form + Zod. Tables use TanStack React Table. Charts use Recharts.

**Key lib files:**
- [lib/redmine.ts](lib/redmine.ts) — `RedmineApi` class wrapping the Redmine REST API with encryption/decryption helpers
- [lib/prismadb.ts](lib/prismadb.ts) — Prisma client singleton
- [prisma/schema.prisma](prisma/schema.prisma) — full DB schema
