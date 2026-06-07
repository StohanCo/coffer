---
name: homelab-finance
description: Project-specific guardrails for finops-local. Use when adding features, refactoring, or making architectural decisions to stay aligned with the homelab/self-hosted-first ethos.
---

# Homelab Finance — Project Skill

Use this skill whenever the user asks to add a feature, refactor, or change tooling in `finops-local`. It prevents architectural drift and keeps the project aligned with its goals.

## Project North Star

A **single-binary, self-hosted personal finance tool** that:
1. Runs on a Raspberry Pi or any cheap homelab box from one Docker image.
2. Keeps every byte of data on the user's machine — no SaaS dependencies.
3. Looks like a paid product, not a side project.
4. Is friendly to a single user or a household (not multi-tenant SaaS).

## Architectural Rules

### Always
- **One process, one container.** No microservices. No separate DB container.
- **SQLite via LibSQL.** It's faster than Postgres for this workload and needs zero ops.
- **All persistence is local.** DB → SQLite file in `/data`. Uploads → `/uploads`. Nothing else.
- **Server-side data extraction.** Use the dashboard service pattern (`src/server/services/`). Don't fetch from the client when you can render server-side.
- **Decimal.js for all money math.** Never use floats for amounts. Store as TEXT in SQLite.
- **One shared `getDashboardData` per page.** Don't make N waterfall queries inside section components.

### Never
- Add a SaaS dependency (Stripe, SendGrid, Auth0, Sentry SaaS) — use self-hosted equivalents only.
- Add a second database (Redis, Postgres, Mongo). LibSQL handles it.
- Use Server Actions for data fetching (only mutations). API routes are explicit.
- Lock the user into a paid plan or feature gate. Everything is free for the homelab user.
- Reintroduce Vercel Blob, Neon, or Vercel cron — those belong to the `personalFinance` project, not this one.
- Use Float for currency. Ever.

## Decision Heuristics

When the user proposes a change, ask:
1. **Does this still run from one `docker compose up`?** If no, redesign.
2. **Can the user export/back up everything by copying `/data` and `/uploads`?** If no, fix it.
3. **Does it work offline?** External API calls must have a cached fallback (see `src/lib/fx.ts`).
4. **Would a non-developer notice this is rough?** UX polish is not optional in v1.

## Stack Anchors

- Next.js 15 (App Router, Turbopack)
- React 19
- TypeScript strict
- Drizzle ORM + LibSQL
- better-auth (email/password)
- Tailwind CSS + Radix UI primitives
- Recharts for charts
- Lucide for icons
- Decimal.js for money
- node-cron for scheduling
- pnpm

When proposing alternatives, the bar is high: a 30%+ improvement on a measurable axis (perf, maintenance, DX, bundle size). "It's newer" is not a reason.

## File Layout (canonical)

```
src/
  app/                 # Next.js App Router
    api/               # All API routes
    sign-in/, register/, page.tsx
  components/
    layout/            # AppShell, sidebar, skeleton
    sections/          # One per nav item
    modals/            # Add-X dialogs (share Modal/Field/inputCls from AddAccountModal)
    ui/                # Reusable primitives (Skeleton, Spinner)
  lib/
    auth/              # better-auth server + client
    db/                # Drizzle schema + client
    cron.ts            # node-cron schedules
    fx.ts              # FX rates (DB-cached, background refresh)
    currencies.ts      # Built-in + user-extra ISO 4217 codes
    storage.ts         # Local filesystem uploads
    utils.ts           # cn(), formatCurrency(), formatDate()
  server/
    services/          # Server-side data extraction (dashboard.ts)
  middleware.ts        # nodejs runtime — guards all routes except /sign-in, /register, /api/auth
  instrumentation.ts   # Boots cron on server start
```

## Common Patterns

- **New section:** create `src/components/sections/XSection.tsx`, add it to `NAV_ITEMS` and the `renderSection()` switch in `AppShell.tsx`.
- **New API route:** put it under `src/app/api/...` using `requireSession()` + `ok()/err()` from `@/lib/api-helpers.ts`.
- **New table:** add to `src/lib/db/schema.ts`, define relations in same file, run `pnpm db:push`. Drizzle's `db.query.X.findMany({ with: ... })` REQUIRES `relations()` declarations.
- **New modal:** import `Modal`, `Field`, `inputCls`, `primaryCls`, `secondaryCls` from `AddAccountModal`. Don't duplicate the styles.
- **Money input:** input as `text` with `pattern="\d+(\.\d{1,2})?"` so user-entered strings round-trip into Decimal cleanly.

## Pre-Commit Checklist

- [ ] `pnpm typecheck` passes
- [ ] No new SaaS dependencies in `package.json`
- [ ] If a new table or column was added, `pnpm db:push` ran cleanly
- [ ] If a new external API call was added, it has a fallback path
- [ ] Buttons that trigger async ops show `<Spinner />` while loading
- [ ] Any new icon-only button has `aria-label`
- [ ] Currency math uses Decimal, never `parseFloat() + parseFloat()`
- [ ] No `console.log` in committed code (use `console.error` with `[scope]` prefix for genuine errors)
