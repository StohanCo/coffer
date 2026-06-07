# FinOps Local — Roadmap & State of the Project

> Living document. Updated whenever scope or priorities shift. Use it to resume work in any future session.

---

## 1. Where we are today (2026-05-05)

### What works end-to-end
- Email/password registration + sign-in via better-auth, sessions persisted in SQLite.
- 9-section dashboard: Overview, Accounts, Transactions, Budgets, Analytics, Statistics, Receipts, Tax & GST, Settings.
- Multi-currency support with user-extensible ISO 4217 list (RUB, CNY, CHF, etc. addable from Settings).
- DB-cached FX rates fetched from `open.er-api.com`, refreshed every 6h via node-cron, with 5s warmup on boot. Manual "Refresh now" button in Settings.
- Income/expense KPIs and FX-normalized grand total convert each transaction at the live rate before aggregation.
- Per-currency totals + grand total + FX rates table on Overview and Accounts.
- Budget spending tracked per category with progress bars.
- 6-month income/expenses area chart and category breakdown bar chart on Analytics.
- Month-over-month % deltas on Statistics.
- NZ tax brackets visualization with effective-rate estimate on Tax & GST.
- Skeleton loading state on dashboard initial load; spinners on every async button.
- Single Docker container (`docker compose up`) with two named volumes (`finops_data`, `finops_uploads`).
- GitHub Actions CI: typecheck + lint + build + Docker build.
- Daily account snapshot cron at 02:00 server time.
- Local-filesystem upload serving via authenticated `/uploads/[[...path]]` route.

### Known limitations
- **Receipts feature is read-only** — no upload UI yet, but `receiptUrl` is editable from the transaction edit modal.
- ~~**No transaction edit/delete**~~ — done 2026-05-05: PATCH/DELETE on `/api/transactions/[id]`, edit reuses `AddTransactionModal`, hover row reveals icon actions, native confirm before delete.
- ~~**No transfer between accounts**~~ — done 2026-05-05: `POST /api/transfers` creates two linked transactions sharing a `transferId`, FX-converts when accounts differ in currency (with manual override), `TransferModal` uses live rates from dashboard data, transfer rows render with arrow icon and cyan/slate colors.
- **Budget creation has no UI** — `BudgetsSection` displays but no "Add budget" modal.
- **No account edit/archive UI** — only create.
- **No transaction filtering by date range** — only type and search.
- **Recurring transactions table exists but has no UI or runtime processing.**
- **No data export** — homelab users want CSV/JSON dumps.
- **No data import** — onboarding requires manual entry of historical transactions.
- **Charts are static colors** — no theming, no comparison overlays.
- **Layout is purely vertical scroll** — no command palette, no keyboard navigation, no draggable cards.
- **Mobile is functional but not delightful** — sidebar slides in, but touch targets and gesture support are minimal.
- **Single user only** — no household/shared mode despite being a multi-currency tool perfect for couples.
- **No backup/restore primitives** beyond "copy the volume".

### Performance baseline
- Cold dashboard render with 200 transactions: ~150ms server, ~80ms client hydration on a modern laptop. Expect 3–5× on a Raspberry Pi 5.
- SQLite WAL mode on, foreign keys on. Single-user contention is a non-issue.
- LibSQL has no native binary — pure JS, runs anywhere Node 22 runs.
- First-load JS shared bundle: ~103 kB (Next.js base). Each page +1–3 kB.

---

## 2. UX/UI improvements

The current UI is functional, dark, and consistent — but flat. The biggest issue is that **the screen never moves except when you click a nav item**. Below is a prioritized backlog with concrete implementation notes.

### 2.1 Tier-1 — Visual polish (low effort, high impact)

| Item | What | How |
|------|------|-----|
| **Density toggle** | Comfortable / Compact / Cosy modes. Saves to localStorage. | Tailwind variants on a `data-density` attribute on `<html>` switching padding scales. |
| **Sticky section header** | Page title sticks while scrolling, fades in a colored backdrop. | `position: sticky` + IntersectionObserver to add a `.scrolled` class. |
| **Card hover state** | Account/transaction rows lift on hover with a subtle 1px border glow. | `hover:shadow-[0_0_0_1px_rgba(34,197,94,0.4)]` + `transition-shadow`. No scale (avoids layout shift). |
| **Animated KPI counts** | KPI numbers count up from 0 on first paint. | Custom hook with `requestAnimationFrame` over 600ms with easeOutCubic. Respect `prefers-reduced-motion`. |
| **Trend indicator on KPIs** | Arrow + % delta pill next to each KPI value (vs previous month). | Server-computed in `dashboard.ts`. Already partially there in Stats. |
| **Per-currency flag/symbol** | `🇳🇿 NZD`, `🇷🇺 RUB` next to currency tiles. | Tiny ISO-to-emoji-flag map in `lib/currencies.ts`. |
| **Sparklines on account cards** | 30-day balance trendline on each account card. | Use `account_snapshot` table data. Tiny SVG inline, ~80px wide. Recharts is overkill. |
| **Empty-state illustrations** | Replace "No transactions yet" text with friendly SVG + CTA. | One reusable `<EmptyState icon="receipt" />` component. |
| **Toast notifications** | Replace inline error text with toasts for non-form actions (FX refresh, currency add). | Build a 30-line toast hook; no need for Sonner. |
| **Glass card variant** | Optional translucent panel for hero cards (Overview header). | `bg-brand-surface/40 backdrop-blur-md border-white/5`. |

### 2.2 Tier-2 — Layout dynamics (medium effort)

| Item | What | How |
|------|------|-----|
| **Bento grid Overview** | Replace the linear Overview with a 12-column bento grid: large total, two KPI tiles, account list, recent transactions, mini sparklines, FX strip — sized for visual rhythm. | CSS Grid with named areas, `grid-template-rows: masonry` (or `auto` fallback). |
| **Drawer instead of modal** | Add Transaction slides in from the right on desktop, bottom on mobile. | `vaul` library or hand-rolled with `@radix-ui/react-dialog` + animation. |
| **Command palette** | Cmd/Ctrl-K opens search across transactions, accounts, sections. | `cmdk` library (1.5 kB). Action: navigate, "Add transaction", "Add account". |
| **Hover popovers on transaction rows** | Hovering a row shows a quick-action popover with edit/delete/duplicate. | `@radix-ui/react-hover-card` (already a dep). |
| **Animated sidebar collapse** | Collapse sidebar to icon-only on a button click. Saves preference. | `width: 240px` ↔ `width: 64px` with `transition-[width] duration-200`. |
| **Section transitions** | Cross-fade/slide between sections instead of instant swap. | `framer-motion` `<AnimatePresence mode="wait">` keyed on section. |
| **Draggable account cards** | Drag to reorder accounts; persist the order. | `@dnd-kit/core` + a `sortIndex` column. |
| **Pinned categories** | Drag-to-pin frequently used categories to the top of the picker. | Same. |
| **Bottom tab bar on mobile** | Replace the hamburger with a 5-icon bottom bar (Overview/Accounts/Add/Transactions/More). | Mobile-only component, the "Add" button opens the drawer directly. |

### 2.3 Tier-3 — Charts & data viz (medium effort, big "fintech feel" payoff)

| Item | What | How |
|------|------|-----|
| **Net worth timeline** | Hero line chart on Overview showing total balance (FX-normalized) over time using `account_snapshot`. | New service method, area chart with confidence shading. |
| **Sankey diagram of cashflow** | Income sources → categories → savings/debt. | `recharts` doesn't ship Sankey; use `@nivo/sankey` (50 kB) or `d3-sankey` (4 kB). |
| **Treemap of spending** | Square-packed by category amount; color by parent group. | `recharts` Treemap is built-in. |
| **Calendar heatmap** | Daily spending intensity, GitHub-style. | Custom SVG, ~100 lines. |
| **Forecast confidence band** | Project next 3 months' expenses with high/low bands using rolling avg. | Compute server-side; `recharts` Area with two series. |
| **Category drilldown** | Click a bar in Analytics → expand into per-merchant breakdown. | URL state with `useSearchParams`. |
| **Budget vs actual ribbon** | Bullet chart showing budget bar with actual progress and target marker. | Custom SVG. |

### 2.4 Tier-4 — Motion & interaction principles

When implementing any of the above, follow these rules:

- **Duration:** 150ms for micro (hover, focus), 200–300ms for layout, 400ms+ only for storytelling moments (first-paint reveal).
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out) for entrances; `cubic-bezier(0.7, 0, 0.84, 0)` (ease-in) for exits.
- **Reduced motion:** Always check `prefers-reduced-motion` (already wired globally).
- **Stagger:** When animating a list of items in, stagger by 30–50ms.
- **Number transitions:** Money values should *count*, not blink.
- **Color transitions:** Status changes (over budget, payment received) use a 1-second color pulse, not a jump.

---

## 3. New features (homelab-finance perspective)

Ranked by impact ÷ effort.

### 3.1 Must-have to feel like a real product

1. **Edit & delete transactions.** Currently the killer omission. Modal that reuses `AddTransactionModal` skeleton. Reverses the balance delta on delete/amount-change.
2. **Transfer between accounts.** Single transaction with two legs (debit one, credit the other). Schema already supports `type: "transfer"`.
3. **Account edit + archive.** "Closed" accounts disappear from default views but stay in history.
4. **Budget create/edit/delete UI.** The data model is in place; just no form.
5. **CSV import** — bank statement upload with column mapping. The single feature most likely to onboard real users.
6. **CSV/JSON export** — backup + tax accountant deliverables.
7. **Transaction search across the whole history** with date range + amount range + currency + account filters.

### 3.2 Smart automation (this is what justifies "AI" in a finance app)

8. **Auto-categorization** — string-match merchant against past transactions. Suggest, don't auto-apply.
9. **Anomaly detection** — flag transactions >2σ from category average.
10. **Recurring transaction processing** — table exists. Spawn the next instance when `nextDue` passes via cron.
11. **Receipt OCR & autofill** — already partially scoped (`ANTHROPIC_API_KEY` env var). Ship it: drop receipt image → Claude Haiku extracts merchant/amount/date/category → user confirms.
12. **Smart bill reminders** — "your power bill arrived 28 days ago, expect another in 2 days".

### 3.3 Multi-user / household

13. **Household mode** — one DB, multiple users, shared accounts. Add a `household` table and an `is_shared` column on accounts.
14. **Per-user privacy** — some accounts visible only to one member.
15. **Shared budgets** — both users see "rent budget", individual ones for personal spending.

### 3.4 Self-hosting QoL

16. **Backup CLI / API** — `POST /api/admin/backup` produces a tarball of `/data` + `/uploads`.
17. **Restore from backup** — drop a tarball into the running container.
18. **Health dashboard at `/admin`** — DB size, last cron runs, FX cache age, snapshot count.
19. **Telegram/email notifications** — over-budget warnings, large-transaction alerts. Self-hosted SMTP only (or webhook).
20. **iCal feed of upcoming bills** — subscribe in any calendar app.

### 3.5 Tax & reporting (especially for NZ contractors per the persona)

21. **GST report by period** — the data is there, surface it.
22. **Provisional tax calculator** with safe-harbor option.
23. **Receipt → invoice matching** (for self-employed users).
24. **Mileage tracker** — quick-add screen for IRD claims.
25. **End-of-year PDF report.**

### 3.6 Power-user features

26. **Tags on transactions** (already a column) — multi-select, filterable.
27. **Custom categories with hierarchy** — Groceries → Food → Restaurants.
28. **Split transactions** — one $200 supermarket bill into Groceries $150 + Household $50.
29. **Currency hedging view** — "if NZD drops 10%, your USD savings are worth N more."
30. **Net worth goals** with progress and projected completion date.

---

## 4. Stack / tooling / performance review

### 4.1 What we'd keep no matter what
- **Next.js 15 App Router.** RSC + Suspense pattern fits the dashboard model perfectly.
- **LibSQL.** Pure JS, no native compilation, WAL mode, instant ops.
- **Drizzle.** Type-safe, lighter than Prisma by ~80% bundle, no codegen step.
- **better-auth.** Active, extensible, owns its own session model. NextAuth lost its maintainer and is a drag.
- **Tailwind 3 + Radix UI primitives.** Standard, fast.
- **Recharts.** Good enough for v1.

### 4.2 Worth swapping in

| Today | Swap to | Why |
|-------|---------|-----|
| `setTimeout(refresh, 5000)` warmup | `register()` in `instrumentation.ts` calling `refreshFxRates()` directly | Cleaner, no HTTP round-trip on boot. |
| `Recharts` only | `Recharts` + `d3-sankey` (~4 kB) for cashflow | Sankey is the dataviz for "where did my money go". |
| `node-cron` | Keep, but expose schedules as env vars | `CRON_SNAPSHOT="0 2 * * *"`. Homelab folks tweak. |
| Tailwind 3 | **Tailwind 4** | Native `@theme` directive, better DX, same bundle, no PostCSS. Single-day migration. |
| Manual loading states | `useFormStatus` + Server Actions for mutations | Reduces boilerplate. Keep API routes only for cron + integrations. |
| No tests | **Vitest + Playwright** | One smoke E2E (register → add account → add txn → see it on overview) goes a long way. |
| No e2e in CI | Add Playwright stage to `ci.yml` | Catch regressions before release. |
| No bundle budget | `next build` with `bundle-analyzer` and `size-limit` | Stop bundle bloat before it starts. |

### 4.3 Don't add (despite temptation)

- **Postgres.** SQLite handles everything in this domain.
- **Redis / a separate cache.** LibSQL + in-memory module-level cache is enough.
- **tRPC.** Server Components + small API routes do the job; tRPC adds ceremony.
- **Storybook.** This is a single-app, single-author project; the cost > benefit.
- **A queue (BullMQ / RabbitMQ).** node-cron + DB-backed jobs cover homelab needs.
- **OpenTelemetry.** A simple `[scope]` log prefix is enough. Add later if it actually causes pain.

### 4.4 Self-hosting / Docker improvements

| Item | What | Effort |
|------|------|--------|
| **Multi-arch Docker image** (amd64 + arm64) | RPi5/Apple Silicon support out of the box. | Add `platforms` to `docker/build-push-action`. |
| **Distroless or Alpine-musl base** | Image size from ~250 MB → ~80 MB. | Switch `Dockerfile` runner stage to `gcr.io/distroless/nodejs22-debian12`. |
| **Read-only root filesystem** | `read_only: true` in compose with explicit `tmpfs`. | Hardens against runtime tampering. |
| **Healthcheck improvements** | `wget -qO- /api/health` already works; add liveness vs readiness split. | Tiny. |
| **Reverse-proxy guidance in README** | Caddy + Tailscale Funnel snippet. nginx + Cloudflare Tunnel snippet. | Doc-only. |
| **Auto-update via Watchtower** | Document the labels, ship a pre-tagged image. | Doc-only. |
| **Image published to ghcr.io** | `release.yml` workflow on tag. | Half a day. |
| **`docker compose up -d` time → first paint < 5s** | Profile cold start, lazy-load chart libs. | Worth measuring. |
| **Resource limits in compose** | `mem_limit: 512m` so it can't OOM the host. | Trivial. |
| **Optional Postgres adapter** for users who insist | A `DATABASE_URL=postgres://...` switch. | Drizzle supports it; +50 lines. Not in v1. |
| **Built-in nightly DB backup** | `cron: 0 4 * * * → tar /data → /backups/finops-$(date).tar.gz` keep 30 days. | One file. |
| **Telegraf/Prometheus exporter** | `/api/metrics` for homelab dashboards. | One route, ~30 lines. |

### 4.5 Developer experience

- Add `pnpm test`, `pnpm test:e2e`, `pnpm format` (Prettier), `pnpm check` (= typecheck + lint + format check).
- Add `pre-commit` hook running `pnpm check` on staged files via `lint-staged`.
- Add a one-liner `pnpm seed` that creates a demo user with sample accounts and 6 months of generated transactions — invaluable for screenshots and demos.
- Add `.devcontainer.json` so contributors can `Open in Container` and have a working env in 60s.
- Add `pnpm docker:dev` that runs the production-like image locally.

---

## 5. Skill files in `.claude/skills/`

Two skills now live in this repo so any future Claude session boots with the right context:

1. **`ui-ux-pro-max`** (copied from personalFinance) — design system intelligence, color palettes, font pairings, chart recommendations, and a Python search CLI. Invoke with `/ui-ux-pro-max` or via the search script. Use it for UI work.
2. **`homelab-finance`** (project-specific) — guardrails for architectural decisions: what to add, what to refuse, file layout, decision heuristics. Auto-applied to this project.

When you (or a future agent) opens this repo, both are picked up automatically.

---

## 6. Suggested order of next sessions

A pragmatic 6-session plan, each ~2–3 hours:

| Session | Focus | Outcome |
|---------|-------|---------|
| **1** | Transaction edit/delete + transfer between accounts | The basic CRUD hole closed. Receipt URL editable too. |
| **2** | Budget create/edit/delete UI + recurring-transaction processor cron | Two of three "data exists, no UI" gaps fixed. |
| **3** | CSV import + CSV/JSON export | Bridges to real-world bank data and tax accountants. |
| **4** | Bento grid Overview + animated KPIs + sticky section header + density toggle | "Wow this looks like a paid product" moment. |
| **5** | Net worth timeline chart + Sankey cashflow + calendar heatmap | The dataviz showcase. |
| **6** | Multi-arch Docker + distroless base + nightly backup + ghcr.io publish + README homelab guide | Genuinely deployable to other people. |

Each session should:
- Update this file's "Where we are today" section as the first edit.
- Move completed items from "Roadmap" to "Done".
- Add any new ideas to the appropriate tier.

---

## 7. Done log

Date | Change
---- | -------
2026-05-03 | Initial scaffold of finops-local: schema, auth, AppShell, sections, modals, Docker, CI.
2026-05-03 | Multi-currency: extra currency UI, ISO 4217 validation, BalanceSummary component.
2026-05-03 | FX rates: live API + DB cache + 6h cron + manual refresh + Settings rates table.
2026-05-03 | FX-aware income/expense totals (transactions converted at calculation time).
2026-05-03 | UX polish pass: skeletons, tabular numerals, focus rings, prefers-reduced-motion, emerald CTA migration.
2026-05-03 | Project skill `homelab-finance` added; UI-UX skill copied across.
2026-05-03 | This roadmap document created.
2026-05-05 | Session 1: transaction edit/delete + transfer between accounts. Added `transferId` schema column, `/api/transactions/[id]` PATCH/DELETE (transfer-aware: deletes both legs and reverts both balances), `/api/transfers` POST (two-leg, FX-converted), `TransferModal`, `AddTransactionModal` edit mode + receiptUrl field, row hover actions and Transfer button in TransactionsSection.
