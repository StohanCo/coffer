# FinOps Local

A self-hosted personal finance tracker built for homelabs and NZ contractors. Single Docker container, SQLite database, no external dependencies.

![CI](https://github.com/your-username/finops-local/actions/workflows/ci.yml/badge.svg)

## Features

- **Accounts** — multi-currency support (NZD, AUD, USD, etc.)
- **Transactions** — income, expense, transfer with category tagging
- **Budgets** — monthly/weekly/yearly spending limits with progress tracking
- **Analytics** — 6-month income vs expenses charts, category breakdown
- **Statistics** — month-over-month comparisons
- **Receipts** — upload a photo and it's scanned **on-server** (Tesseract OCR, no third-party API) to auto-fill amount, date, and merchant
- **Tax & GST** — NZ income tax estimates with bracket breakdown
- **Auth** — email/password registration, no OAuth required

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Database | SQLite via Drizzle ORM |
| Auth | better-auth (email/password) |
| UI | Tailwind CSS + Radix UI primitives |
| Charts | Recharts |
| Icons | Lucide |
| Runtime | Node.js 22 |
| Container | Docker (single container) |

## Quick Start

### Local development

```bash
# 1. Clone and install
git clone https://github.com/your-username/finops-local
cd finops-local
pnpm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local — set BETTER_AUTH_SECRET

# 3. Create the database schema
pnpm db:push

# 4. Start the dev server
pnpm dev
```

Open [http://localhost:3000/register](http://localhost:3000/register) to create your account.

### Docker (local production build)

```bash
# 1. Create your .env file
cp .env.example .env
# Edit .env — set BETTER_AUTH_SECRET and CRON_SECRET

# 2. Build and start
docker compose up -d

# 3. View logs
docker compose logs -f app
```

The database schema is created automatically on first boot — the container applies
the bundled SQL migrations in `drizzle/` (see `src/lib/db/migrate.ts`), so no manual
`db:push` is needed in Docker.

### Production deploy (self-hosted, `homefinance.findyou.work`)

A single Docker container behind the host's nginx + Let's Encrypt. Full
step-by-step guide — DNS, env, build, nginx, HTTPS, backups, updates — in
**[DEPLOY.md](DEPLOY.md)**. Quick version:

```bash
cp .env.example .env          # set secrets + BETTER_AUTH_URL/NEXT_PUBLIC_APP_URL to the https domain
docker compose -f docker-compose.prod.yml up -d --build
```

The prod compose binds the app to `127.0.0.1:8760` only; nginx
(`deploy/nginx-homefinance.findyou.work.conf`) is the public entry point.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | No | Path to SQLite file (default: `./data/finops.db`) |
| `BETTER_AUTH_SECRET` | **Yes** | Random secret — `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | No | App base URL (default: `http://localhost:3000`) |
| `CRON_SECRET` | **Yes** | Secret for internal cron calls |
| `NEXT_PUBLIC_APP_URL` | No | Public base URL — receipt image links derive from it (default: `http://localhost:3000`) |
| `NEXT_PUBLIC_DEFAULT_CURRENCY` | No | Default currency code (default: `NZD`) |

> Receipt scanning is on-server (Tesseract OCR) and needs no API key.

## Development

```bash
pnpm dev          # Start dev server with Turbopack
pnpm typecheck    # TypeScript check
pnpm lint         # ESLint
pnpm build        # Production build
pnpm db:push      # Apply schema to database
pnpm db:studio    # Open Drizzle Studio
```

## Project Status & Roadmap

See **[docs/ROADMAP.md](docs/ROADMAP.md)** for the current state of the project, prioritized backlog (UX polish, new features, stack improvements), and a 6-session plan to take it from "works" to "ships".

## Working with Claude Code

This repo ships with two project-local Claude Code skills in `.claude/skills/`:

- **`homelab-finance`** — project-specific guardrails: what to add, what to refuse, decision heuristics, file layout. Use it when adding features or refactoring.
- **`ui-ux-pro-max`** — design system intelligence with searchable database of styles, palettes, fonts, charts. Invoke with `/ui-ux-pro-max` or run `python .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system`.

### Design skills (workspace-wide)

Installed in the parent workspace at `../.claude/skills/` and available to every project under `Projects/`, for elevating the UI beyond generic "AI-looking" defaults:

- **`impeccable`** — production-grade frontend design/redesign/critique/audit with committed design choices and live iteration.
- **`emil-design-eng`** — Emil Kowalski's philosophy on UI polish, component design, and animation.
- **`taste-skill`** suite — anti-slop design taste: `design-taste-frontend`, `redesign-existing-projects`, `high-end-visual-design`, `minimalist-ui`, `industrial-brutalist-ui`, plus brand-kit and image-direction skills.

When polishing FinOps screens (dashboard, charts, modals), invoke `impeccable` or `redesign-existing-projects` and keep the dark-mode / IBM Plex Sans / emerald-CTA system from the roadmap.

A long-form project memory also lives in your global Claude Code memory at `~/.claude/projects/.../memory/project_finops_local.md` so any session resumes with full context.

## License

MIT
