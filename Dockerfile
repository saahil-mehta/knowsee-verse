# syntax=docker/dockerfile:1
#
# Production image for Cloud Run. Multi-stage: install deps, build the
# standalone Next.js output, then assemble a slim runner with system Chromium
# for the Puppeteer-based PDF export. Database migrations are NOT run here
# (there is no database at image-build time); they run as a separate deploy
# step against Cloud SQL (`pnpm db:migrate`), see the Terraform harness.

FROM node:20-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build only; the build script's migrate prefix is for local dev. The image is
# built without a database, so invoke next build directly.
RUN pnpm exec next build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# System Chromium + fonts for the Puppeteer PDF export (PUPPETEER_EXECUTABLE_PATH).
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Next.js standalone output: a minimal server with only traced dependencies.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Cloud Run sets PORT (default 8080) and routes to it; next start / the
# standalone server honour PORT and HOSTNAME.
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
EXPOSE 8080

CMD ["node", "server.js"]
