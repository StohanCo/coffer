# FinOps Local

A self-hosted personal finance tracker built for homelabs and NZ contractors. Single Docker container, SQLite database, no external dependencies.

![CI](https://github.com/your-username/finops-local/actions/workflows/ci.yml/badge.svg)

## Features

- **Accounts** — multi-currency support (NZD, AUD, USD, etc.)
- **Transactions** — income, expense, transfer with category tagging
- **Budgets** — monthly/weekly/yearly spending limits with progress tracking
- **Analytics** — 6-month income vs expenses charts, category breakdown
- **Statistics** — month-over-month comparisons
- **Receipts** — local file storage, AI-powered scanning (optional, requires Anthropic API key)
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

### Docker (production)

```bash
# 1. Create your .env file
cp .env.example .env
# Edit .env — set BETTER_AUTH_SECRET and CRON_SECRET

# 2. Build and start
docker compose up -d

# 3. View logs
docker compose logs -f app
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | No | Path to SQLite file (default: `./data/finops.db`) |
| `BETTER_AUTH_SECRET` | **Yes** | Random secret — `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | No | App base URL (default: `http://localhost:3000`) |
| `CRON_SECRET` | **Yes** | Secret for internal cron calls |
| `ANTHROPIC_API_KEY` | No | Enables AI receipt scanning |
| `NEXT_PUBLIC_DEFAULT_CURRENCY` | No | Default currency code (default: `NZD`) |

## Development

```bash
pnpm dev          # Start dev server with Turbopack
pnpm typecheck    # TypeScript check
pnpm lint         # ESLint
pnpm build        # Production build
pnpm db:push      # Apply schema to database
pnpm db:studio    # Open Drizzle Studio
```

## License

MIT
