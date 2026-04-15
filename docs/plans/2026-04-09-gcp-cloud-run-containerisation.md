# GCP Cloud Run Containerisation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Containerise the Next.js BFF for GCP Cloud Run deployment, with platform-adaptive abstractions so one codebase serves both Vercel (preview) and Cloud Run (production).

**Architecture:** Multi-stage Docker build (install → build → runtime) producing a standalone Next.js image under 500MB. Platform adapters abstract Vercel-specific features (file storage, geolocation, telemetry) behind interfaces selected at runtime via environment signals (`VERCEL`, `K_SERVICE`). Reliability features (health check, env validation, graceful shutdown) ensure production-grade operation.

**Tech Stack:** Node 22 Alpine, Docker multi-stage, `@google-cloud/storage`, existing `@opentelemetry/api`

**Intent Plan:** `docs/plans/2026-03-18-gcp-cloud-run-migration-intent.md` — strategic context, gap analysis, 10 intents.

**Scope:** Intents 1–5 and 10 (code changes). Intents 6 (Terraform), 7 (Supabase separation — done), 8 (AI Gateway — works via API key), 9 (custom domain — GCP config) are follow-ups.

---

## Phase 1: Build Foundation

### Task 1: Enable Standalone Output

Next.js standalone mode produces a self-contained server with only the required `node_modules`, essential for a minimal Docker image. Also add GCS hostname to allowed remote image patterns for when file storage switches to GCS.

**Files:**
- Modify: `next.config.ts`

**Step 1: Update next.config.ts**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  serverExternalPackages: ["pdfkit", "docx"],
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
    ],
  },
};

export default nextConfig;
```

**Step 2: Verify build succeeds**

Run: `pnpm build`
Expected: Build succeeds. `.next/standalone/server.js` exists.

Run: `ls .next/standalone/server.js`
Expected: File exists.

**Step 3: Commit**

```
feat(build): enable standalone output for containerisation
```

---

### Task 2: Create .dockerignore

Keeps the Docker build context lean — excludes `node_modules`, build artefacts, tests, and secrets.

**Files:**
- Create: `.dockerignore`

**Step 1: Write .dockerignore**

```
node_modules
.next
.git
.env
.env.*
*.log
.DS_Store
.vercel
coverage
tests
docs
.playwright
playwright-report
test-results
README.md
CLAUDE.md
vercel-template.json
```

**Step 2: Commit**

```
chore: add .dockerignore
```

---

## Phase 2: Platform Abstraction

### Task 3: Platform Detection Module

Runtime platform detection via environment signals. Vercel sets `VERCEL=1`, Cloud Run sets `K_SERVICE=<service-name>`. Business logic never checks these directly — it calls platform adapters.

**Files:**
- Create: `lib/platform/detect.ts`

**Step 1: Write platform detection**

```typescript
/**
 * Runtime platform detection via environment signals.
 * Never use custom flags — rely on platform-injected env vars.
 */

/** Running on Vercel (preview or production). */
export const isVercel = Boolean(process.env.VERCEL);

/** Running on GCP Cloud Run. */
export const isCloudRun = Boolean(process.env.K_SERVICE);
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

**Step 3: Commit**

```
feat(platform): add runtime platform detection
```

---

### Task 4: Geolocation Adapter

Replace direct `@vercel/functions` geolocation import with a platform-aware adapter. On Vercel, reads geo headers via the SDK. On Cloud Run/local, returns empty hints — the system prompt gracefully omits location context.

Also removes the `Geo` type dependency from `@vercel/functions` in the prompts module, and updates the chat route's error logging to use a platform-agnostic request ID.

**Files:**
- Create: `lib/platform/geolocation.ts`
- Modify: `lib/ai/instructions/index.ts` (remove `@vercel/functions` type import, re-export from platform)
- Modify: `app/(chat)/api/chat/route.ts` (use adapter, update request ID)

**Step 1: Create geolocation adapter**

```typescript
import { isVercel } from "./detect";

export type RequestHints = {
  latitude: string | undefined;
  longitude: string | undefined;
  city: string | undefined;
  country: string | undefined;
};

/**
 * Extract geolocation hints from the incoming request.
 *
 * Vercel: reads platform-injected geo headers via @vercel/functions.
 * Other platforms: returns empty hints (system prompt omits location context).
 */
export async function getGeolocationHints(
  request: Request,
): Promise<RequestHints> {
  if (isVercel) {
    const { geolocation } = await import("@vercel/functions");
    const geo = geolocation(request);
    return {
      latitude: geo.latitude ?? undefined,
      longitude: geo.longitude ?? undefined,
      city: geo.city ?? undefined,
      country: geo.country ?? undefined,
    };
  }

  // Cloud Run / local: geolocation unavailable without CDN proxy.
  // The system prompt will omit the location section.
  return {
    latitude: undefined,
    longitude: undefined,
    city: undefined,
    country: undefined,
  };
}
```

**Step 2: Update `lib/ai/instructions/index.ts`**

Remove the `@vercel/functions` type import. Import and re-export `RequestHints` from the platform module.

Replace:
```typescript
import type { Geo } from "@vercel/functions";
```
With:
```typescript
import type { RequestHints } from "@/lib/platform/geolocation";
```

Remove the local `RequestHints` type definition (approx. lines 112–118):
```typescript
// REMOVE THIS BLOCK:
export type RequestHints = {
  latitude: Geo["latitude"];
  longitude: Geo["longitude"];
  city: Geo["city"];
  country: Geo["country"];
};
```

Add re-export:
```typescript
export type { RequestHints } from "@/lib/platform/geolocation";
```

Ensure `getRequestPromptFromHints` and `systemPrompt` continue to accept `RequestHints` — only the type source changes, not the shape.

**Step 3: Update `app/(chat)/api/chat/route.ts`**

Replace the `@vercel/functions` import:
```typescript
// REMOVE:
import { geolocation } from "@vercel/functions";

// ADD:
import { getGeolocationHints } from "@/lib/platform/geolocation";
```

Update the geolocation call (line 110) — now async:
```typescript
// BEFORE:
const { longitude, latitude, city, country } = geolocation(request);

// AFTER:
const { longitude, latitude, city, country } =
  await getGeolocationHints(request);
```

Update the error handler request ID (line 320):
```typescript
// BEFORE:
const vercelId = request.headers.get("x-vercel-id");
// ...
console.error("Unhandled error in chat API:", error, { vercelId });

// AFTER:
const requestId =
  request.headers.get("x-vercel-id") ??
  request.headers.get("x-cloud-trace-context")?.split("/")[0];
console.error("Unhandled error in chat API:", error, { requestId });
```

**Step 4: Verify build**

Run: `pnpm build`
Expected: Build succeeds. No `@vercel/functions` static imports in business logic.

**Step 5: Commit**

```
refactor(platform): extract geolocation into platform adapter
```

---

### Task 5: Storage Adapter

Replace direct `@vercel/blob` import with a platform-aware adapter. On Vercel, uses Blob. On Cloud Run, uses GCS (Application Default Credentials — automatic on Cloud Run). Add `@google-cloud/storage` as a new dependency.

**Files:**
- Create: `lib/platform/storage.ts`
- Modify: `app/(chat)/api/files/upload/route.ts`
- Modify: `next.config.ts` (add `@google-cloud/storage` to `serverExternalPackages`)
- Modify: `package.json` (new dependency)

**Step 1: Install dependency**

Run: `pnpm add @google-cloud/storage`
Expected: Package added to `package.json`, lockfile updated.

**Step 2: Add to serverExternalPackages in `next.config.ts`**

```typescript
serverExternalPackages: ["pdfkit", "docx", "@google-cloud/storage"],
```

**Step 3: Create storage adapter**

```typescript
import { isVercel } from "./detect";

export interface UploadResult {
  url: string;
  pathname: string;
}

/**
 * Upload a file to platform storage.
 *
 * Vercel: @vercel/blob (requires BLOB_READ_WRITE_TOKEN).
 * Cloud Run: GCS (requires GCS_BUCKET; auth via ADC — automatic on Cloud Run).
 */
export async function uploadFile(
  filename: string,
  buffer: ArrayBuffer,
  options: { access?: "public" } = {},
): Promise<UploadResult> {
  if (isVercel) {
    const { put } = await import("@vercel/blob");
    const result = await put(filename, buffer, {
      access: options.access ?? "public",
    });
    return { url: result.url, pathname: result.pathname };
  }

  // GCS upload — ADC handles auth automatically on Cloud Run
  const bucketName = process.env.GCS_BUCKET;
  if (!bucketName) {
    throw new Error(
      "GCS_BUCKET environment variable is required for file uploads",
    );
  }

  const { Storage } = await import("@google-cloud/storage");
  const storage = new Storage();
  const file = storage.bucket(bucketName).file(filename);

  await file.save(Buffer.from(buffer), {
    public: options.access === "public",
  });

  return {
    url: `https://storage.googleapis.com/${bucketName}/${filename}`,
    pathname: filename,
  };
}
```

**Step 4: Update upload route**

In `app/(chat)/api/files/upload/route.ts`:

```typescript
// REMOVE:
import { put } from "@vercel/blob";

// ADD:
import { uploadFile } from "@/lib/platform/storage";
```

Replace the put() call:
```typescript
// BEFORE:
const data = await put(`${filename}`, fileBuffer, {
  access: "public",
});

// AFTER:
const data = await uploadFile(filename, fileBuffer, {
  access: "public",
});
```

**Step 5: Verify build**

Run: `pnpm build`
Expected: Build succeeds. No `@vercel/blob` static imports in business logic.

**Step 6: Commit**

```
refactor(platform): extract file storage into platform adapter

Adds @google-cloud/storage for GCS support on Cloud Run.
Vercel continues to use @vercel/blob via the same interface.
```

---

### Task 6: Platform-Aware Instrumentation

Make `instrumentation.ts` platform-conditional. On Vercel, use `@vercel/otel` (existing). On Cloud Run, skip OTel for now — Cloud Logging automatically captures `console.*` output with structured metadata. Cloud Trace integration can be added as a future enhancement.

**Files:**
- Modify: `instrumentation.ts`

**Step 1: Update instrumentation**

```typescript
export async function register() {
  if (process.env.VERCEL) {
    const { registerOTel } = await import("@vercel/otel");
    registerOTel({ serviceName: "knowsee-verse" });
  }

  // Cloud Run: console output → Cloud Logging (automatic).
  // Cloud Trace: add @opentelemetry/sdk-node in a future iteration.
}
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds. No `@vercel/otel` static import.

**Step 3: Commit**

```
refactor(platform): make instrumentation platform-aware
```

---

## Phase 3: Reliability

### Task 7: Health Check Endpoint

Cloud Run needs an HTTP health check to verify the container is ready to serve traffic. This endpoint checks actual database connectivity — not just process liveness.

**Files:**
- Create: `app/api/health/route.ts`

**Step 1: Create health endpoint**

```typescript
import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return Response.json({ status: "healthy" }, { status: 200 });
  } catch (error) {
    console.error("[health] Database check failed:", error);
    return Response.json(
      { status: "unhealthy", error: String(error) },
      { status: 503 },
    );
  }
}
```

**Step 2: Verify locally**

Run: `pnpm dev`
Then: `curl http://localhost:3000/api/health`
Expected: `{"status":"healthy"}` (if POSTGRES_URL is configured) or `503` (if not).

**Step 3: Commit**

```
feat(platform): add health check endpoint with DB connectivity
```

---

### Task 8: Env Validation, Graceful Shutdown, and DB Pool Closure

Three reliability concerns, wired together:

1. **Env validation** — fail fast on startup if required vars are missing (per user preference: errors propagate loudly, no silent fallbacks).
2. **DB pool closure** — export a `closeDb()` function so shutdown can drain connections.
3. **Graceful shutdown** — SIGTERM handler drains in-flight work and closes the DB pool before exit. Essential on Cloud Run where containers are killed on scale-down.

All three are wired into `instrumentation.ts` `register()` — the single startup hook.

**Files:**
- Create: `lib/platform/env.ts`
- Create: `lib/platform/shutdown.ts`
- Modify: `lib/db/client.ts` (export `closeDb`)
- Modify: `instrumentation.ts` (wire validation + shutdown)

**Step 1: Create env validation**

```typescript
const REQUIRED_VARS = ["POSTGRES_URL", "BETTER_AUTH_SECRET"] as const;

const PRODUCTION_VARS = ["BETTER_AUTH_URL"] as const;

/**
 * Validate required environment variables at startup.
 * Throws immediately if any are missing — fail fast, no silent fallbacks.
 */
export function validateEnv(): void {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

  if (process.env.NODE_ENV === "production") {
    missing.push(
      ...PRODUCTION_VARS.filter((key) => !process.env[key]),
    );
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
}
```

**Step 2: Export closeDb from `lib/db/client.ts`**

Add at the end of the file:

```typescript
/** Close the connection pool. Call on SIGTERM for graceful shutdown. */
export async function closeDb(): Promise<void> {
  await client.end();
}
```

**Step 3: Create graceful shutdown handler**

```typescript
import { closeDb } from "@/lib/db/client";

let shuttingDown = false;

/**
 * Register SIGTERM/SIGINT handlers for graceful shutdown.
 * Drains the database pool and exits cleanly.
 */
export function registerShutdownHandlers(): void {
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[shutdown] ${signal} received, draining connections...`);
    try {
      await closeDb();
      console.log("[shutdown] Database pool closed");
    } catch (error) {
      console.error("[shutdown] Error closing database:", error);
    }
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
```

**Step 4: Wire into `instrumentation.ts`**

```typescript
export async function register() {
  // Fail fast if required env vars are missing
  const { validateEnv } = await import("@/lib/platform/env");
  validateEnv();

  // Graceful shutdown: drain DB pool on SIGTERM
  const { registerShutdownHandlers } = await import(
    "@/lib/platform/shutdown"
  );
  registerShutdownHandlers();

  // Platform-specific telemetry
  if (process.env.VERCEL) {
    const { registerOTel } = await import("@vercel/otel");
    registerOTel({ serviceName: "knowsee-verse" });
  }
}
```

**Step 5: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

**Step 6: Commit**

```
feat(platform): add env validation, graceful shutdown, and db pool closure
```

---

## Phase 4: Container and Operations

### Task 9: Multi-Stage Dockerfile

Three-stage build: install dependencies → build Next.js → minimal runtime. The runtime stage copies only standalone output, static assets, public files, and instruction markdown files (loaded at runtime via `readFileSync`).

Migrations are NOT run inside the container — they are a separate pre-deploy step (`make db-migrate`). This avoids requiring database access during the Docker build.

**Files:**
- Create: `Dockerfile`

**Step 1: Write Dockerfile**

```dockerfile
# ─── Base ───
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat

# ─── Dependencies ───
FROM base AS deps
WORKDIR /app
RUN corepack enable pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ─── Build ───
FROM base AS build
WORKDIR /app
RUN corepack enable pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm exec next build

# ─── Runtime ───
FROM base AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Standalone server + bundled node_modules
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./

# Static assets (not included in standalone output)
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

# Instruction markdown files loaded at runtime via readFileSync(process.cwd() + ...)
COPY --from=build --chown=nextjs:nodejs /app/lib/ai/instructions ./lib/ai/instructions

USER nextjs

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

EXPOSE 3000

CMD ["node", "server.js"]
```

**Step 2: Verify Docker build**

Run: `docker build -t knowsee-verse:test .`
Expected: Build completes without errors.

Run: `docker image ls knowsee-verse:test --format "{{.Size}}"`
Expected: Under 500MB.

**Step 3: Commit**

```
feat(docker): add multi-stage Dockerfile for Cloud Run deployment
```

---

### Task 10: Makefile Docker and Deployment Targets

Composable targets for the Docker workflow. Uses `IMAGE` and `TAG` variables for flexibility — override `IMAGE` when pushing to Artifact Registry.

**Files:**
- Modify: `Makefile`

**Step 1: Add docker and deployment targets**

Append to the existing Makefile:

```makefile
# ─── Docker ───
.PHONY: docker-build docker-run docker-push

IMAGE ?= knowsee-verse
TAG ?= $(shell git rev-parse --short HEAD)

docker-build:
	docker build -t $(IMAGE):$(TAG) -t $(IMAGE):latest .

docker-run: docker-build
	docker run --rm -p 3000:3000 --env-file .env.local $(IMAGE):latest

docker-push:
	docker push $(IMAGE):$(TAG)
	docker push $(IMAGE):latest

# ─── Cloud Run ───
.PHONY: cloud-restart cloud-logs cloud-describe

GCP_PROJECT ?= knowsee-verse-prod
GCP_REGION ?= europe-west2
GCP_SERVICE ?= knowsee-verse

cloud-restart:
	gcloud run services update $(GCP_SERVICE) \
		--project $(GCP_PROJECT) \
		--region $(GCP_REGION) \
		--image $(IMAGE):$(TAG)

cloud-logs:
	gcloud run services logs read $(GCP_SERVICE) \
		--project $(GCP_PROJECT) \
		--region $(GCP_REGION) \
		--limit 100

cloud-describe:
	gcloud run services describe $(GCP_SERVICE) \
		--project $(GCP_PROJECT) \
		--region $(GCP_REGION)

# ─── Deployment ───
.PHONY: deploy

deploy: docker-build docker-push cloud-restart
```

**Step 2: Verify**

Run: `make -n docker-build`
Expected: Shows the `docker build` command without executing it.

Run: `make -n deploy`
Expected: Shows docker-build → docker-push → cloud-restart sequence.

**Step 3: Commit**

```
feat(make): add docker, cloud run, and deployment targets
```

---

### Task 11: End-to-End Verification

Build the Docker image and run it locally to verify the full stack works inside a container.

**Step 1: Build**

Run: `make docker-build`
Expected: Build completes.

**Step 2: Check image size**

Run: `docker image ls knowsee-verse --format "table {{.Tag}}\t{{.Size}}"`
Expected: Both `latest` and `<hash>` tags exist. Size under 500MB.

**Step 3: Run locally**

Ensure `.env.local` has at minimum `POSTGRES_URL` and `BETTER_AUTH_SECRET` set.

Run: `make docker-run`
Expected: Container starts, logs show no errors.

**Step 4: Test health endpoint**

Run (in another terminal): `curl http://localhost:3000/api/health`
Expected: `{"status":"healthy"}` with HTTP 200.

**Step 5: Test home page**

Open: `http://localhost:3000` in browser.
Expected: Login page loads correctly with styles and fonts.

**Step 6: Stop container**

Press Ctrl+C in the terminal running `make docker-run`.
Expected: Logs show `[shutdown] SIGINT received, draining connections...` and `[shutdown] Database pool closed`.

---

## Summary

| Task | Intent | Files changed | New deps |
|------|--------|---------------|----------|
| 1. Standalone output | 5 | `next.config.ts` | — |
| 2. .dockerignore | 5 | `.dockerignore` | — |
| 3. Platform detection | 1 | `lib/platform/detect.ts` | — |
| 4. Geolocation adapter | 1 | `lib/platform/geolocation.ts`, 2 existing | — |
| 5. Storage adapter | 1 | `lib/platform/storage.ts`, 2 existing | `@google-cloud/storage` |
| 6. Instrumentation | 4 | `instrumentation.ts` | — |
| 7. Health endpoint | 2 | `app/api/health/route.ts` | — |
| 8. Env + shutdown | 2 | 4 files (2 new, 2 modified) | — |
| 9. Dockerfile | 5 | `Dockerfile` | — |
| 10. Makefile | 10 | `Makefile` | — |
| 11. Verification | — | — | — |

**Out of scope (follow-ups):**
- Terraform (Intent 6) — separate IaC initiative
- Supabase environment separation (Intent 7) — already done
- AI Gateway API key config (Intent 8) — env var, no code change
- Custom domain + SSL (Intent 9) — GCP config, no code change
- Cloud Trace exporter — future observability enhancement
- CI/CD automation — post-pilot
