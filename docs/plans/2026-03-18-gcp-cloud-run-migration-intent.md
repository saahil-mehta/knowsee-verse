# GCP Cloud Run Migration — Intent Plan

> **Status:** Draft
> **Date:** 2026-03-18
> **Context:** Digitas (Publicis Groupe) paid 30-day pilot + future GCP Marketplace listing
> **Principle:** Intent survives, implementation drifts. This document captures outcomes, not code.

## Architecture

```
GCP Cloud Run (production — knowsee-verse-prod)
├── Next.js container (single service)
├── Vercel AI Gateway (via AI_GATEWAY_API_KEY)
│   ├── anthropic/claude-* (chat + extraction)
│   ├── openai/gpt-4o-mini (probing)
│   ├── google/gemini-2.0-flash (probing)
│   └── mistral/mistral-small-latest (probing)
├── Supabase PostgreSQL (knowsee-prod project)
├── Mailgun EU (OTP / email)
├── GCS bucket (replaces Vercel Blob for file uploads)
├── Redis — Upstash or Memorystore (resumable streams)
└── GCP Secret Manager (all secrets via SOPS)

Vercel (preview only — PR deployments)
├── Vercel AI Gateway (via OIDC, automatic)
└── Supabase PostgreSQL (knowsee-dev project)

Local development
├── Docker Compose PostgreSQL (make db-up)
└── Direct env vars (.env.local)
```

---

## Gap Analysis

### P0 — Will break immediately

| # | Gap | Impact | Files |
|---|-----|--------|-------|
| 1 | `@vercel/blob` — `put()` unavailable | File uploads return 500 | `api/files/upload/route.ts` |
| 2 | No CORS headers | Vercel auto-adds them; Cloud Run does not. Browser blocks API calls if frontend/API ever on different origins. | All route handlers |
| 3 | `next/server after()` | Background work (stream persistence to Redis/DB) may not complete before container kill | `api/chat/route.ts:46` |
| 4 | No graceful shutdown | SIGTERM kills in-flight 300s streams. Postgres connections leak. | Entire app |

### P1 — Will degrade silently

| # | Gap | Impact | Files |
|---|-----|--------|-------|
| 5 | `@vercel/functions` geolocation | Returns undefined. System prompt loses location context. | `api/chat/route.ts:1,110` |
| 6 | `@vercel/otel` | Instrumentation does nothing. Zero observability. | `instrumentation.ts` |
| 7 | `next/image` optimisation | Falls back to unoptimised images. Slower but functional. | `next.config.ts`, 3 components |
| 8 | No env var validation at startup | Container accepts traffic with missing secrets. First request crashes. Health check passes despite broken config. | `lib/db/client.ts` |
| 9 | Image remote patterns | `avatar.vercel.sh` and `*.public.blob.vercel-storage.com` irrelevant on GCP; next/image rejects new storage URLs. | `next.config.ts:8-14` |

### P2 — Needs infrastructure

| # | Gap | Impact |
|---|-----|--------|
| 10 | Redis | Resumable streams disabled without it. For a paid pilot, stream recovery matters. |
| 11 | Cloud Run timeout | `maxDuration=300` is ignored. Must set in Cloud Run service config. |
| 12 | Database cold starts | Each new container creates a fresh 10-connection pool. `idle_timeout: 20s` is aggressive. |
| 13 | Dockerfile | Does not exist. Need multi-stage Node 22 Alpine build. |
| 14 | Terraform environment | No GCP infra-as-code for knowsee-verse. |

### P3 — Cosmetic / low risk

| # | Gap | Detail |
|---|-----|--------|
| 15 | `x-vercel-id` in error logs | Undefined on Cloud Run. |
| 16 | `@vercel/analytics` | In package.json, never imported. Dead dependency. |
| 17 | `.vercel/` directory | Vercel CLI artifact. Irrelevant. |
| 18 | Fonts (`next/font/google`) | Downloaded at build time. Works fine. |

---

## Intents

### 1. Platform-Adaptive Service Layer

**Outcome:** The application runs on both Vercel (preview) and Cloud Run (production) from a single codebase. No platform-specific code in business logic.

**Constraints:**
- Platform detection uses environment signals (`VERCEL`, `K_SERVICE`), not custom flags
- Business logic never imports platform packages directly
- Each adapter module exposes an identical interface regardless of backend

**Applies to:** File storage, geolocation, observability

**Success:** `pnpm build` succeeds on both platforms. A route handler calling `uploadFile()` doesn't know or care whether it hits Vercel Blob or GCS.

---

### 2. Production-Grade Reliability

**Outcome:** Cloud Run handles the full lifecycle — cold start, steady state, scale-down, termination — without data loss or connection leaks.

**Constraints:**
- Container validates all required env vars before accepting traffic
- SIGTERM triggers graceful drain: finish in-flight responses, close database pool, exit
- Health check endpoint verifies actual database connectivity, not just process liveness

**Success:** Kill a container mid-chat-stream. Client reconnects. Stream resumes (if Redis) or partial response is preserved in database.

---

### 3. Cross-Origin Access

**Outcome:** API routes accessible from frontend regardless of deployment topology.

**Constraints:**
- Cloud Run production serves frontend + API from same container (same-origin — CORS not needed)
- If frontend and API are ever separated, CORS middleware activates automatically
- Preview on Vercel continues as-is

**Success:** Browser on `app.knowsee.ai` calls `/api/chat` without CORS errors.

---

### 4. Observability Parity

**Outcome:** Production on Cloud Run has equal or better observability than Vercel.

**Constraints:**
- All runtime errors visible in Cloud Logging
- Traces export to Cloud Trace for latency analysis
- Structured logs with request IDs for correlation

**Success:** When an OTP fails to send, the error appears in Cloud Logging within seconds, with full stack trace and the email address. No more "zero runtime logs for 7 days."

---

### 5. Containerised Build

**Outcome:** A single Dockerfile produces an optimised container image that runs the full Next.js application.

**Constraints:**
- Multi-stage build (install → build → runtime) for minimal image size
- Database migrations run at build time (existing pattern), with clear failure mode if DB unreachable
- Static assets, instruction files, fonts bundled into image
- `serverExternalPackages` (pdfkit, docx) correctly included in standalone output

**Success:** `docker build` produces image under 500MB. `docker run` with correct env vars serves identically to Vercel.

---

### 6. Infrastructure as Code

**Outcome:** Entire Cloud Run deployment reproducible via Terraform, borrowing knowsee-main modules.

**Constraints:**
- New Terraform environment for knowsee-verse production
- Secrets via SOPS → Secret Manager (existing pattern)
- Supabase remains external — only `POSTGRES_URL` stored in Secret Manager
- GCS bucket provisioned for file uploads

**Success:** `make tf-apply ENV=prod` creates Cloud Run service, Secret Manager secrets, Artifact Registry repo, GCS bucket. `make docker-build && make docker-push && make cloud-restart` deploys the app.

---

### 7. Supabase Environment Separation

**Outcome:** Development and production use separate Supabase projects. Local development uses Docker Compose PostgreSQL.

**Constraints:**
- Local: Docker Compose PostgreSQL (existing `make db-up`)
- Preview (Vercel): `knowsee-dev` Supabase project
- Production (Cloud Run): `knowsee-prod` Supabase project (new)
- Schema migrations applied identically via same Drizzle pipeline

**Success:** A migration generated locally applies cleanly to both Supabase projects. Schema error in dev never reaches prod.

---

### 8. AI Gateway Portability

**Outcome:** Vercel AI Gateway works from Cloud Run using API key authentication. No code changes to probing or chat pipeline.

**Constraints:**
- `AI_GATEWAY_API_KEY` stored in Secret Manager
- Model probing (OpenAI, Google, Mistral, Anthropic) continues through gateway
- If Anthropic-specific features (PTC, memory) needed later, add direct `@ai-sdk/anthropic` alongside gateway — not instead of it

**Success:** Run visibility audit from Cloud Run. All 4 probe models respond. Extraction completes. No auth errors.

---

### 9. Custom Domain + SSL

**Outcome:** Digitas pilot accessible on a branded URL with HTTPS.

**Constraints:**
- Cloud Run domain mapping or external load balancer
- `BETTER_AUTH_URL` matches production domain (cookie/session binding)
- SSL termination via GCP managed certificate

**Success:** `https://app.knowsee.ai` (or similar) loads login page. OTP arrives. User completes full auth flow.

---

### 10. Composable Makefile

**Outcome:** All operational workflows — local dev, containerisation, deployment, infrastructure, database — driven through composable Make targets. One entry point for every action.

**Constraints:**
- Targets are composable: high-level targets compose low-level ones (e.g. `deploy` = `docker-build` + `docker-push` + `cloud-restart`)
- `ENV` parameter gates environment (dev/prod), never hardcoded
- DRY: no duplicated commands across targets
- Mirrors knowsee-main's proven Makefile patterns where applicable
- Existing targets (dev, install, build, lint, format, test, check, db-*) preserved

**Target groups:**

| Group | Targets | Purpose |
|-------|---------|---------|
| Development | `dev`, `install`, `build`, `check` | Existing — unchanged |
| Database | `db-up`, `db-generate`, `db-migrate`, `db-reset`, `db-proxy` | Local + remote DB management |
| Docker | `docker-build`, `docker-push`, `docker-run` | Container lifecycle |
| Cloud Run | `cloud-restart`, `cloud-logs`, `cloud-describe` | Service management |
| Terraform | `tf-init`, `tf-plan`, `tf-apply`, `tf-destroy`, `tf-output` | Infrastructure lifecycle |
| GCP | `gcp-login`, `gcp-status` | Authentication + context |
| Secrets | `secrets-encrypt`, `secrets-decrypt`, `secrets-edit` | SOPS secret management |
| Deployment | `deploy` | Orchestrates build → push → restart |

**Success:** A new developer reads `make help` and understands every operational workflow. `make deploy ENV=prod` takes the current code to production in one command. No raw `gcloud`, `docker`, or `terraform` commands needed outside the Makefile.

---

## Explicitly Out of Scope

- **Multi-tenancy** — Digitas is single-tenant. Multi-tenant is post-pilot.
- **CI/CD automation** — Manual Makefile-driven deploys for a 30-day pilot. GitHub Actions later.
- **GCP Marketplace listing** — Requires billing integration, Helm charts, marketplace approval. Separate initiative after pilot.
- **Load balancer / Cloud CDN** — Cloud Run built-in HTTPS sufficient for pilot scale.
- **Database migration to Cloud SQL** — Supabase stays. Revisit only if connection limits become a problem.
