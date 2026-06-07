# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# ── deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# ── prod-deps ─────────────────────────────────────────────────────────────────
# Production-only node_modules for the runtime image. Next's standalone tracer
# can't follow libsql's dynamic/native requires, so we ship a real, complete
# runtime dependency tree instead of the trimmed standalone one.
FROM base AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod

# ── builder ───────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DOCKER_BUILD=1
ENV BETTER_AUTH_SECRET=build-placeholder
ENV BETTER_AUTH_URL=http://localhost:3000
ENV DATABASE_URL=/data/finops.db

RUN pnpm build

# ── runner ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# On-server receipt OCR — no third-party API. English data pack only.
RUN apk add --no-cache tesseract-ocr tesseract-ocr-data-eng

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

RUN mkdir -p /data /uploads && chown -R nextjs:nodejs /data /uploads

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Overlay the complete production node_modules (after standalone, so it wins).
# Fixes libsql native binding + transitive deps the standalone tracer drops.
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
# SQL migrations — applied on boot (see src/lib/db/migrate.ts) to create the schema on a fresh volume.
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
