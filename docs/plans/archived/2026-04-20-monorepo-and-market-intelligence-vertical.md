# Monorepo & Market-Intelligence Vertical Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure knowsee-verse into a Turborepo + pnpm workspaces monorepo with two apps — `apps/marketing` (current knowsee.co.uk on Anthropic direct) and `apps/market-intelligence` (new vertical, basic chatbot on Claude via Vertex AI) — sharing a minimal common package set.

**Architecture:** `packages/*` holds lowest-common-denominator code that works across providers (chat shell, AI core helpers, UI primitives, DB chat schema, auth, artifacts). `apps/*` holds vertical-specific code (provider config, tools, branding, instructions, vertical DB tables). Marketing keeps the full Anthropic feature surface (memory, web_fetch). Market-intelligence runs a basic chatbot on Vertex Claude — **no BigQuery tool, no Cloud IAP, no dashboarding, no curated pages in this plan** (those are future plans built on top of this foundation).

**Tech Stack:** Turborepo 2, pnpm 9 workspaces, Next.js 16, Vercel AI SDK 6, `@ai-sdk/anthropic` (marketing), `@ai-sdk/google-vertex` (market-intelligence, Claude models), Drizzle ORM, better-auth, Tailwind 4, Biome via ultracite, Playwright.

**Pre-flight decisions (locked by brainstorm 2026-04-20):**

- Repo strategy: **C — Turborepo monorepo** (decided after weighing fork/runtime-config alternatives; see brainstorm conversation)
- Provider per app: marketing on Anthropic direct, market-intelligence on Vertex Claude (GCP billing requirement)
- Memory + web_fetch: Anthropic-only; live in `apps/marketing/`, never enter shared packages
- Dockerise branch: **STASH before this plan starts**, re-apply per-app in a follow-up plan
- This plan starts from `main`, not `dockerise`

**Out of scope (explicitly):**

- BigQuery tool, account-360 page, top-buyers page, SBTi page (future market-intelligence plan)
- Cloud IAP integration (future market-intelligence plan)
- Cloud Run Terraform (future GCP-isation plan)
- Dockerfile per app (future plan, after Docker stash is restored)
- `apps/law`, `apps/mitram` (future verticals — structure must support them, not implement them)
- Branding context provider (deferred — apps hard-code branding for now)
- Customer-facing portal (long-term)

---

## Phase 0 — Pre-flight

### Task 0.1: Verify and stash dockerise WIP

**Files:** none

**Step 1:** Check current branch + status

```bash
git status
git branch --show-current
```

Expected: on `dockerise`, with modifications to Makefile, instrumentation.ts, lib/db/client.ts, next.config.ts, proxy.ts, plus untracked `.dockerignore`, `Dockerfile`, `app/api/`, `lib/platform/`, `scripts/`, `docs/plans/2026-04-15-dockerisation-summary.md`.

**Step 2:** Stash including untracked

```bash
git stash push -u -m "dockerise WIP — restore after monorepo migration"
```

Expected: "Saved working directory and index state On dockerise: dockerise WIP — restore after monorepo migration"

**Step 3:** Verify clean

```bash
git status
```

Expected: "nothing to commit, working tree clean"

**Step 4:** Record stash ref for later

```bash
git stash list | head -1 > /tmp/dockerise-stash.txt
cat /tmp/dockerise-stash.txt
```

Expected: `stash@{0}: On dockerise: dockerise WIP — restore after monorepo migration`

### Task 0.2: Branch from main

```bash
git checkout main
git pull --ff-only
git checkout -b monorepo-migration
git branch --show-current
```

Expected: `monorepo-migration`

### Task 0.3: Baseline regression check

**Step 1:** Install deps from `main`

```bash
pnpm install
```

Expected: clean install, no errors.

**Step 2:** Build

```bash
pnpm build
```

Expected: clean Next.js build. Record any warnings — these are baseline noise, not regressions.

**Step 3:** Run e2e tests

```bash
pnpm test
```

Expected: tests pass (or document baseline failures in commit message of next task — they are pre-existing, not introduced by us).

**Step 4:** Save baseline

```bash
git rev-parse HEAD > /tmp/baseline-sha.txt
cat /tmp/baseline-sha.txt
```

---

## Phase 1 — Monorepo skeleton

### Task 1.1: Workspace declaration

**Files:** Create `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Step 1:** Write file

**Step 2:** Verify

```bash
cat pnpm-workspace.yaml
```

### Task 1.2: Install Turborepo at root

```bash
pnpm add -Dw turbo@^2
```

Expected: `turbo` added to root `package.json` devDependencies. `pnpm-lock.yaml` updated.

### Task 1.3: Create `turbo.json`

**Files:** Create `turbo.json`

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"],
      "env": ["NODE_ENV"]
    },
    "lint": {},
    "format": {
      "cache": false
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["playwright-report/**", "test-results/**"],
      "env": ["PLAYWRIGHT", "POSTGRES_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "ANTHROPIC_API_KEY"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    }
  }
}
```

### Task 1.4: Reshape root `package.json`

**Files:** Modify `package.json`

Replace entire content with:

```json
{
  "name": "knowsee-verse",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "dev:marketing": "turbo dev --filter=@knowsee/marketing",
    "dev:market-intelligence": "turbo dev --filter=@knowsee/market-intelligence",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test",
    "format": "ultracite fix"
  },
  "devDependencies": {
    "@biomejs/biome": "2.3.11",
    "turbo": "^2",
    "typescript": "^5.6.3",
    "ultracite": "^7.0.11"
  },
  "packageManager": "pnpm@9.12.3"
}
```

All other deps move to `apps/marketing/package.json` in Phase 2.

### Task 1.5: Commit skeleton

```bash
git add pnpm-workspace.yaml turbo.json package.json pnpm-lock.yaml
git commit -m "chore(monorepo): scaffold pnpm workspace + turborepo"
```

---

## Phase 2 — Port knowsee-verse to `apps/marketing`

This phase is mechanical: relocate the existing app into `apps/marketing/`. No refactoring, no extraction. Goal is to leave the marketing app **byte-identical in behaviour** to the baseline at end of Phase 0.

### Task 2.1: Create `apps/marketing/` directory

```bash
mkdir -p apps/marketing
```

### Task 2.2: Move app source directories

```bash
git mv app apps/marketing/app
git mv artifacts apps/marketing/artifacts
git mv components apps/marketing/components
git mv hooks apps/marketing/hooks
git mv lib apps/marketing/lib
git mv public apps/marketing/public
git mv tests apps/marketing/tests
```

### Task 2.3: Move marketing-specific config files

```bash
git mv next.config.ts apps/marketing/next.config.ts
git mv proxy.ts apps/marketing/proxy.ts
git mv instrumentation.ts apps/marketing/instrumentation.ts
git mv next-env.d.ts apps/marketing/next-env.d.ts
git mv tsconfig.json apps/marketing/tsconfig.json
git mv drizzle.config.ts apps/marketing/drizzle.config.ts
git mv playwright.config.ts apps/marketing/playwright.config.ts
git mv postcss.config.mjs apps/marketing/postcss.config.mjs
git mv components.json apps/marketing/components.json
git mv vercel.json apps/marketing/vercel.json
git mv vercel-template.json apps/marketing/vercel-template.json
```

### Task 2.4: Move marketing-side package.json

The current root `package.json` was overwritten in Task 1.4. The original deps need to land in `apps/marketing/package.json`. Recover from git history.

**Step 1:** Recover original package.json content

```bash
git show HEAD~1:package.json > apps/marketing/package.json
```

**Step 2:** Edit `apps/marketing/package.json`:

- Change `"name": "ai-chatbot"` → `"name": "@knowsee/marketing"`
- Keep all dependencies and devDependencies from the original
- Keep scripts (dev, build, start, lint, format, db:*, test) as-is — they will be invoked via `turbo run` from root

**Step 3:** Verify

```bash
cat apps/marketing/package.json | grep '"name"'
```

Expected: `"name": "@knowsee/marketing"`

### Task 2.5: Adjust path-sensitive configs

**Step 1:** `apps/marketing/tsconfig.json` — verify `paths` mapping `@/*` still resolves. Should work unchanged because the `@/*` alias is relative to the `tsconfig.json` location.

**Step 2:** `apps/marketing/drizzle.config.ts` — open and verify the schema path. If it points to `./lib/db/schema.ts` (relative), it works. If it has `lib/db/schema.ts` without leading `./`, also works. No change expected.

**Step 3:** `apps/marketing/playwright.config.ts` — verify `testDir` is `./tests` (relative). No change expected.

**Step 4:** `apps/marketing/next.config.ts` — no path changes needed.

### Task 2.6: Move Makefile to apps/marketing

```bash
git mv Makefile apps/marketing/Makefile
```

A root-level Makefile is a future convenience, not required now.

### Task 2.7: Update root `.gitignore`

**Files:** Modify `.gitignore`

Add:

```
# Turborepo
.turbo
apps/*/.turbo
packages/*/.turbo

# per-app build artifacts (already covered, but explicit)
apps/*/.next
apps/*/node_modules
packages/*/node_modules
apps/*/playwright-report
apps/*/test-results
```

### Task 2.8: Install + first turbo build

```bash
pnpm install
```

Expected: pnpm sees the new workspace, installs `apps/marketing` deps under `node_modules`, hoists where possible.

```bash
pnpm build
```

Expected: turbo runs `build` in `apps/marketing`, Next.js compiles successfully.

### Task 2.9: Verification gate — marketing dev server

**Step 1:** Start dev

```bash
pnpm dev:marketing
```

**Step 2:** In a separate terminal, hit the homepage

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3000/
```

Expected: `200` or `307` (redirect to login is fine).

**Step 3:** Stop dev server.

### Task 2.10: Verification gate — marketing playwright

```bash
pnpm test
```

Expected: same pass/fail counts as the baseline in Task 0.3. **No new failures.** If failures appear, investigate before proceeding.

### Task 2.11: Commit port

```bash
git add -A
git commit -m "refactor(monorepo): port knowsee-verse to apps/marketing"
```

---

## Phase 3 — Extract minimum shared packages

Each package extraction is a discrete task. After each, marketing must still build and run. Extract in dependency order: leaves first, roots last.

**Extraction order:**

1. `packages/ui` (no internal deps)
2. `packages/db-chat` (no internal deps)
3. `packages/auth` (depends on db-chat)
4. `packages/ai-core` (no internal deps — memory/web_fetch stay in marketing)
5. `packages/artifacts` (depends on ui, ai-core)
6. `packages/chat-shell` (depends on ui, artifacts, ai-core, db-chat, auth)

For every extraction:

- Create `packages/<name>/` with `package.json`, `tsconfig.json`, `index.ts` barrel
- `name`: `@knowsee/<name>`, version `0.0.0`, `"private": true`
- `main`: `./src/index.ts`, `types`: `./src/index.ts`
- Move source files from `apps/marketing/` to `packages/<name>/src/`
- Add `"@knowsee/<name>": "workspace:*"` to `apps/marketing/package.json`
- Update imports in `apps/marketing` from local paths (`@/components/ui/button`) to package imports (`@knowsee/ui`)
- Run `pnpm install`, then `pnpm build`, then `pnpm dev:marketing` to verify
- Commit

### Task 3.1: Extract `packages/ui`

**Files:**

- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/src/index.ts`
- Move: `apps/marketing/components/ui/*` → `packages/ui/src/`
- Move: `apps/marketing/components/elements/*` → `packages/ui/src/elements/` (if generic)
- Move: `apps/marketing/components/ai-elements/*` → `packages/ui/src/ai-elements/`

**Step 1:** Create skeleton

```bash
mkdir -p packages/ui/src
```

`packages/ui/package.json`:

```json
{
  "name": "@knowsee/ui",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./*": "./src/*.tsx"
  },
  "dependencies": {
    "@radix-ui/react-collapsible": "^1.1.12",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-hover-card": "^1.1.15",
    "@radix-ui/react-icons": "^1.3.0",
    "@radix-ui/react-progress": "^1.1.8",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-separator": "^1.1.8",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-tooltip": "^1.2.8",
    "@radix-ui/react-use-controllable-state": "^1.2.2",
    "@radix-ui/react-visually-hidden": "^1.1.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "lucide-react": "^0.446.0",
    "radix-ui": "^1.4.3",
    "react": "19.0.1",
    "react-dom": "19.0.1",
    "tailwind-merge": "^2.5.2"
  },
  "peerDependencies": {
    "react": "^19",
    "react-dom": "^19"
  }
}
```

`packages/ui/tsconfig.json` — copy from `apps/marketing/tsconfig.json`, drop Next.js-specific fields. Keep `"jsx": "preserve"`, `"module": "esnext"`, `"moduleResolution": "bundler"`.

**Step 2:** Move files

```bash
git mv apps/marketing/components/ui packages/ui/src/ui
git mv apps/marketing/components/elements packages/ui/src/elements
git mv apps/marketing/components/ai-elements packages/ui/src/ai-elements
```

**Step 3:** Create barrel `packages/ui/src/index.ts`

Re-export all components. Use a script if needed:

```bash
# generate barrel exports
find packages/ui/src -name "*.tsx" -not -name "index.tsx" | \
  sed 's|packages/ui/src/||; s|.tsx$||; s|^|export * from "./|; s|$|";|' \
  > packages/ui/src/index.ts
```

(Or write barrel by hand if file count is small.)

**Step 4:** Update marketing imports

```bash
# Find and replace imports in apps/marketing
grep -rn "from \"@/components/ui" apps/marketing/{app,components,hooks,lib} || true
grep -rn "from \"@/components/elements" apps/marketing/{app,components,hooks,lib} || true
grep -rn "from \"@/components/ai-elements" apps/marketing/{app,components,hooks,lib} || true
```

For each match, replace `@/components/ui/...` → `@knowsee/ui/ui/...`, similarly for elements and ai-elements. Use a sed pass per pattern.

**Step 5:** Add dep to marketing

In `apps/marketing/package.json`, add to dependencies:

```json
"@knowsee/ui": "workspace:*"
```

Remove the now-package'd Radix/lucide/cmdk deps from `apps/marketing/package.json` (they live in `packages/ui` now).

**Step 6:** Verify

```bash
pnpm install
pnpm build
pnpm dev:marketing &
sleep 10
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3000/
kill %1
```

Expected: build succeeds, dev server returns 200/307.

**Step 7:** Commit

```bash
git add -A
git commit -m "refactor(monorepo): extract @knowsee/ui package"
```

### Task 3.2: Extract `packages/db-chat`

Same shape as 3.1. Move:

- `apps/marketing/lib/db/schema.ts` → `packages/db-chat/src/schema.ts`
- `apps/marketing/lib/db/queries.ts` → `packages/db-chat/src/queries.ts`
- `apps/marketing/lib/db/client.ts` → `packages/db-chat/src/client.ts`
- `apps/marketing/lib/db/helpers/*` → `packages/db-chat/src/helpers/*`
- `apps/marketing/lib/db/migrations/*` → `packages/db-chat/src/migrations/*`
- `apps/marketing/lib/db/migrate.ts` → `packages/db-chat/src/migrate.ts`

**Important — schema split:** Marketing has brand-vertical-specific tables alongside chat tables. Inspect `lib/db/schema.ts`. Split into:

- `packages/db-chat/src/schema.ts` — `user`, `session`, `chat`, `message`, `vote`, `document`, `stream`, `memory` (and any other vertical-agnostic tables)
- `apps/marketing/lib/db/schema-marketing.ts` — brand profile, perception, any brand-tagged tables

Both schemas import the same Drizzle instance and are loaded together by `drizzle.config.ts` in marketing.

**Step:** Update `apps/marketing/drizzle.config.ts` to point to both schema files:

```ts
schema: ["../../packages/db-chat/src/schema.ts", "./lib/db/schema-marketing.ts"]
```

`packages/db-chat/package.json`:

```json
{
  "name": "@knowsee/db-chat",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema.ts",
    "./queries": "./src/queries.ts",
    "./client": "./src/client.ts"
  },
  "dependencies": {
    "drizzle-orm": "^0.45.1",
    "postgres": "^3.4.4"
  }
}
```

Update marketing imports: `@/lib/db/queries` → `@knowsee/db-chat/queries`, etc.

Verify: `pnpm build`, `pnpm dev:marketing`, hit homepage.

Commit: `refactor(monorepo): extract @knowsee/db-chat package`

### Task 3.3: Extract `packages/auth`

Move:

- `apps/marketing/lib/auth.ts` → `packages/auth/src/server.ts`
- `apps/marketing/lib/auth-client.ts` → `packages/auth/src/client.ts`
- `apps/marketing/components/auth/*` → `packages/auth/src/components/*`
- `apps/marketing/app/(auth)/layout.tsx`, `login/`, `register/`, `verify-email/`, `api/` — **leave in apps/marketing for now**. Auth routes are app-level. The `packages/auth` package exports the better-auth setup as a callable; each app instantiates it.

`packages/auth/package.json`:

```json
{
  "name": "@knowsee/auth",
  "version": "0.0.0",
  "private": true,
  "main": "./src/server.ts",
  "types": "./src/server.ts",
  "exports": {
    "./server": "./src/server.ts",
    "./client": "./src/client.ts",
    "./components/*": "./src/components/*.tsx"
  },
  "dependencies": {
    "@knowsee/db-chat": "workspace:*",
    "@knowsee/ui": "workspace:*",
    "better-auth": "^1.4.18"
  }
}
```

Update marketing imports. Verify. Commit.

### Task 3.4: Extract `packages/ai-core`

Move:

- `apps/marketing/lib/ai/providers.ts` → `packages/ai-core/src/providers.ts` — **strip the `gateway()` import; replace with a factory that takes a provider instance**:

```ts
// packages/ai-core/src/providers.ts
import type { LanguageModel } from "ai";
import { customProvider } from "ai";
import { isTestEnvironment } from "./constants";

export type ModelResolver = (modelId: string) => LanguageModel;

export function createModelRegistry(resolver: ModelResolver) {
  return {
    getLanguageModel(modelId: string): LanguageModel {
      return resolver(modelId);
    },
  };
}

// test mock factory — apps wire this themselves
export { customProvider };
```

The actual `gateway()` (Anthropic) or `googleVertexAnthropic()` (Vertex) call lives in each app's `lib/ai/provider.ts`.

- `apps/marketing/lib/ai/models.ts` → `packages/ai-core/src/models.ts`
- `apps/marketing/lib/ai/context.ts` → `packages/ai-core/src/context.ts`
- `apps/marketing/lib/ai/prompts.ts` → `packages/ai-core/src/prompts.ts` (composer functions only, not vertical-specific prompt content)
- `apps/marketing/lib/ai/instructions/index.ts` → `packages/ai-core/src/instructions/index.ts` (loader pattern; markdown files stay per-app)
- Provider-agnostic tools:
  - `apps/marketing/lib/ai/tools/create-document.ts` → `packages/ai-core/src/tools/create-document.ts`
  - `apps/marketing/lib/ai/tools/update-document.ts` → `packages/ai-core/src/tools/update-document.ts`
  - `apps/marketing/lib/ai/tools/request-suggestions.ts` → `packages/ai-core/src/tools/request-suggestions.ts`

**Stays in `apps/marketing/lib/ai/`:**

- `tools/memory.ts` (Anthropic-only)
- `tools/server-tools.ts` (web_search + web_fetch — but web_search works on Vertex, so consider splitting: `web-search.ts` could move to ai-core if useful for both)
- `tools/brand-audit.ts`, `tools/brand-perception.ts` (marketing-only)
- `instructions/*.md` (vertical prompts)
- `perception/*` (marketing-only pipeline)
- `models.test.ts`, `models.mock.ts` (test mocks — could go to ai-core if tests are shared; keep marketing-side for now)

`packages/ai-core/package.json`:

```json
{
  "name": "@knowsee/ai-core",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./tools/*": "./src/tools/*.ts"
  },
  "dependencies": {
    "@knowsee/db-chat": "workspace:*",
    "ai": "^6.0.97",
    "zod": "^3.25.76"
  }
}
```

Update marketing imports. Verify. Commit.

### Task 3.5: Extract `packages/artifacts`

Move:

- `apps/marketing/lib/artifacts/server.ts` → `packages/artifacts/src/server.ts`
- `apps/marketing/artifacts/*` → `packages/artifacts/src/kinds/*`
- Artifact-related components from `apps/marketing/components/`:
  - `artifact.tsx`, `artifact-actions.tsx`, `artifact-close-button.tsx`, `artifact-messages.tsx`, `create-artifact.tsx` → `packages/artifacts/src/components/`
  - `code-editor.tsx`, `text-editor.tsx`, `sheet-editor.tsx`, `image-editor.tsx`, `console.tsx`, `diffview.tsx`, `document.tsx`, `document-preview.tsx`, `document-skeleton.tsx`, `version-footer.tsx`, `toolbar.tsx` → `packages/artifacts/src/components/`

`packages/artifacts/package.json`:

```json
{
  "name": "@knowsee/artifacts",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@knowsee/ai-core": "workspace:*",
    "@knowsee/ui": "workspace:*",
    "@codemirror/lang-javascript": "^6.2.2",
    "@codemirror/lang-python": "^6.1.6",
    "@codemirror/state": "^6.5.0",
    "@codemirror/theme-one-dark": "^6.1.2",
    "@codemirror/view": "^6.35.3",
    "codemirror": "^6.0.1",
    "diff-match-patch": "^1.0.5",
    "docx": "^9.6.1",
    "katex": "^0.16.25",
    "papaparse": "^5.5.2",
    "pdfkit": "^0.17.2",
    "prosemirror-example-setup": "^1.2.3",
    "prosemirror-inputrules": "^1.4.0",
    "prosemirror-markdown": "^1.13.1",
    "prosemirror-model": "^1.23.0",
    "prosemirror-schema-basic": "^1.2.3",
    "prosemirror-schema-list": "^1.4.1",
    "prosemirror-state": "^1.4.3",
    "prosemirror-view": "^1.34.3",
    "react": "19.0.1",
    "react-data-grid": "7.0.0-beta.47",
    "react-syntax-highlighter": "^15.6.6",
    "shiki": "^3.21.0"
  }
}
```

Verify, commit.

### Task 3.6: Extract `packages/chat-shell`

Move chat composition components. Keep branding-laden ones (greeting, brand-profile-*) in `apps/marketing`.

Move to `packages/chat-shell/src/`:

- `chat.tsx`, `messages.tsx`, `message.tsx`, `message-actions.tsx`, `message-editor.tsx`, `message-reasoning.tsx`
- `multimodal-input.tsx`, `preview-attachment.tsx`, `suggestion.tsx`
- `chat-header.tsx`, `app-sidebar.tsx`, `sidebar-history.tsx`, `sidebar-history-item.tsx`, `sidebar-projects.tsx`, `sidebar-toggle.tsx`
- `data-stream-handler.tsx`, `data-stream-provider.tsx`, `tool-stream-handler.tsx`
- `visibility-selector.tsx`, `branch-chat-card.tsx`, `branch-origin-bar.tsx`
- `error-boundary.tsx`, `context-warning-banner.tsx`, `theme-provider.tsx`, `toast.tsx`
- `apps/marketing/hooks/*` — most likely all chat-shell-related (auto-resume, scroll-to-bottom, etc.)
- `apps/marketing/lib/types.ts`, `lib/utils.ts`, `lib/constants.ts`, `lib/errors.ts`, `lib/api/*` (chat-related API helpers)

**Stays in `apps/marketing/`:**

- `greeting.tsx`, `typewriter-text.tsx`, `suggested-actions.tsx` (these may have brand content)
- `brand-profile-*.tsx`, `brand-search-input.tsx`, `probe-grid.tsx`, `project-home.tsx` (marketing-only)
- `memory-dialog.tsx` (marketing-only — memory tool is Anthropic-only)
- `app/(chat)/*` — routes are app-level

`packages/chat-shell/package.json`:

```json
{
  "name": "@knowsee/chat-shell",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@knowsee/ai-core": "workspace:*",
    "@knowsee/artifacts": "workspace:*",
    "@knowsee/auth": "workspace:*",
    "@knowsee/db-chat": "workspace:*",
    "@knowsee/ui": "workspace:*",
    "@ai-sdk/react": "^3.0.99",
    "ai": "^6.0.97",
    "framer-motion": "^11.3.19",
    "motion": "^12.23.26",
    "nanoid": "^5.1.3",
    "next-themes": "^0.3.0",
    "react": "19.0.1",
    "react-resizable-panels": "^2.1.7",
    "remark-gfm": "^4.0.1",
    "remark-parse": "^11.0.0",
    "resumable-stream": "^2.2.10",
    "sonner": "^1.5.0",
    "streamdown": "^2.0.1",
    "swr": "^2.2.5",
    "unified": "^11.0.5",
    "use-stick-to-bottom": "^1.1.1",
    "usehooks-ts": "^3.1.0"
  }
}
```

Update marketing imports. Verify. Commit.

### Task 3.7: Verify marketing post-extraction

```bash
pnpm install
pnpm build
pnpm test
pnpm dev:marketing &
sleep 15
# manual smoke: open http://localhost:3000, log in, send a chat message
kill %1
```

Expected: build clean, tests pass at baseline, manual smoke shows chat working including memory tool and brand audit.

Commit a noop tag if all extractions pass:

```bash
git tag monorepo-extraction-complete
```

---

## Phase 4 — Scaffold `apps/market-intelligence`

Bare Next.js app that consumes shared packages and uses Vertex Claude as its only provider.

### Task 4.1: Initialise app skeleton

```bash
mkdir -p apps/market-intelligence/{app,lib,public}
cd apps/market-intelligence
```

`apps/market-intelligence/package.json`:

```json
{
  "name": "@knowsee/market-intelligence",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbo --port 3001",
    "build": "tsx ../../packages/db-chat/src/migrate.ts && next build",
    "start": "next start --port 3001",
    "lint": "ultracite check",
    "format": "ultracite fix",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx ../../packages/db-chat/src/migrate.ts"
  },
  "dependencies": {
    "@knowsee/ai-core": "workspace:*",
    "@knowsee/artifacts": "workspace:*",
    "@knowsee/auth": "workspace:*",
    "@knowsee/chat-shell": "workspace:*",
    "@knowsee/db-chat": "workspace:*",
    "@knowsee/ui": "workspace:*",
    "@ai-sdk/google-vertex": "^3.0.0",
    "@ai-sdk/react": "^3.0.99",
    "ai": "^6.0.97",
    "drizzle-orm": "^0.45.1",
    "next": "16.0.10",
    "next-themes": "^0.3.0",
    "postgres": "^3.4.4",
    "react": "19.0.1",
    "react-dom": "19.0.1",
    "server-only": "^0.0.1",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@types/node": "^22.8.6",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "drizzle-kit": "^0.31.9",
    "tailwindcss": "^4.1.13",
    "@tailwindcss/postcss": "^4.1.13",
    "tsx": "^4.19.1"
  }
}
```

### Task 4.2: Copy minimum config files from marketing

Copy and trim:

- `apps/market-intelligence/next.config.ts` — copy from marketing, remove marketing-specific bits if any
- `apps/market-intelligence/tsconfig.json` — copy from marketing, ensure `paths` `"@/*": ["./*"]` works
- `apps/market-intelligence/postcss.config.mjs` — copy as-is
- `apps/market-intelligence/next-env.d.ts` — copy as-is
- `apps/market-intelligence/drizzle.config.ts` — same as marketing but schema points to `packages/db-chat/src/schema.ts` only (no vertical schema for P0 — vertical tables come in a follow-up plan)
- `apps/market-intelligence/proxy.ts` — copy from marketing, leave auth flow same
- `apps/market-intelligence/instrumentation.ts` — copy as-is

### Task 4.3: Create `apps/market-intelligence/lib/ai/provider.ts`

```ts
import { createVertexAnthropic } from "@ai-sdk/google-vertex/anthropic";

const vertexAnthropic = createVertexAnthropic({
  project: process.env.GCP_PROJECT_ID!,
  location: process.env.GCP_VERTEX_LOCATION ?? "global",
});

export function getLanguageModel(modelId: string) {
  return vertexAnthropic(modelId);
}

export function getTitleModel() {
  return vertexAnthropic("claude-haiku-4-5@20251001");
}
```

(Authentication uses Google ADC — `gcloud auth application-default login` locally, service account in deployment.)

### Task 4.4: Create `apps/market-intelligence/lib/ai/instructions/identity.md`

```markdown
You are Knowsee, a market-intelligence assistant. Help users understand markets,
companies, and accounts. Be precise, cite sources where possible, and acknowledge
uncertainty.
```

(This is intentionally minimal for P0. Detailed prompts come in a follow-up plan.)

### Task 4.5: Create `apps/market-intelligence/lib/ai/instructions/index.ts`

```ts
import identity from "./identity.md?raw";

export function systemPrompt(): string {
  return identity;
}
```

(Use `?raw` import or read the file at build time — match whatever marketing does.)

### Task 4.6: Copy minimum auth surface

Copy from `apps/marketing/app/(auth)/`:

- Layout
- `login/`, `register/` pages
- `api/auth/[...all]/route.ts` (better-auth handler)
- `apps/market-intelligence/lib/auth.ts` — wires `@knowsee/auth/server`

### Task 4.7: Create chat route + page

`apps/market-intelligence/app/(chat)/layout.tsx` — copy from marketing

`apps/market-intelligence/app/(chat)/page.tsx`:

```tsx
import { Chat } from "@knowsee/chat-shell";
import { auth } from "@/lib/auth";

export default async function Page() {
  const session = await auth();
  return <Chat session={session} />;
}
```

(Exact prop shape depends on what `Chat` exports — the executor reads `packages/chat-shell/src/index.ts` to confirm the API.)

`apps/market-intelligence/app/(chat)/api/chat/route.ts` — copy from `apps/marketing/app/(chat)/api/chat/route.ts`, then:

- Replace `import { getLanguageModel } from "@/lib/ai/providers"` with `import { getLanguageModel } from "@/lib/ai/provider"`
- Strip the `experimental_activeTools` array of marketing-only tools (memory, web_fetch, brand-audit, brand-perception)
- Keep generic tools (create-document, update-document, request-suggestions) from `@knowsee/ai-core/tools/*`
- Replace marketing-side instruction loader with `import { systemPrompt } from "@/lib/ai/instructions"`

**Critical detail:** the `chatModel` ID passed to `getLanguageModel` must be a Vertex AI Claude model ID, e.g. `"claude-sonnet-4-6@20250929"` or `"claude-opus-4-7"`. Hardcode for now or accept via request body.

### Task 4.8: Greeting + landing

`apps/market-intelligence/components/greeting.tsx`:

```tsx
export function Greeting({ name }: { name?: string }) {
  return (
    <div className="text-center space-y-2">
      <h1 className="text-2xl font-semibold">Market Intelligence</h1>
      <p className="text-muted-foreground">
        {name ? `Welcome back, ${name}` : "Sign in to get started"}
      </p>
    </div>
  );
}
```

(Bare bones — branding context can come later.)

### Task 4.9: Tailwind globals

`apps/market-intelligence/app/globals.css` — copy from marketing as-is. Theme tokens can be tweaked later.

### Task 4.10: Environment variables

`apps/market-intelligence/.env.local.example`:

```
POSTGRES_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3001
GCP_PROJECT_ID=
GCP_VERTEX_LOCATION=global
GOOGLE_APPLICATION_CREDENTIALS=
```

Document in `apps/market-intelligence/README.md`:

```markdown
# market-intelligence

## Local setup

1. `gcloud auth application-default login`
2. `gcloud config set project <your-gcp-project>`
3. Copy `.env.local.example` to `.env.local`, fill in POSTGRES_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, GCP_PROJECT_ID
4. `pnpm dev:market-intelligence` from repo root
5. Open http://localhost:3001
```

### Task 4.11: Install + build

```bash
pnpm install
pnpm build --filter=@knowsee/market-intelligence
```

Expected: clean build. Fix any import errors revealed by the build (most likely missing barrel exports in shared packages).

### Task 4.12: Commit scaffold

```bash
git add apps/market-intelligence
git commit -m "feat(market-intelligence): scaffold app on vertex claude"
```

---

## Phase 5 — End-to-end verification

### Task 5.1: Verify marketing still works

```bash
pnpm dev:marketing
```

In browser:

1. Visit `http://localhost:3000`
2. Log in
3. Send a chat message
4. Verify response streams in
5. Trigger a brand audit (marketing-specific tool) — confirm it runs
6. Trigger memory creation (e.g. "remember my brand tone is friendly") — confirm memory tool fires

Stop server. **Acceptance:** all marketing features behave identically to baseline.

### Task 5.2: Verify market-intelligence chats end-to-end

Prerequisites:

- `gcloud auth application-default login` completed
- GCP project has Vertex AI API enabled
- Claude model access granted on Vertex AI Model Garden
- `POSTGRES_URL` points to a Postgres reachable for chat history (can reuse marketing's DB or a separate one)

```bash
pnpm db:migrate --filter=@knowsee/market-intelligence
pnpm dev:market-intelligence
```

In browser:

1. Visit `http://localhost:3001`
2. Log in (better-auth flow same as marketing)
3. Send a chat message: "What can you help me with?"
4. Verify response streams in (proves Vertex Claude is reachable and streaming works)
5. Send: "Write a short bullet list of three market-intel topics you can help with."
6. Verify formatted markdown renders

Stop server. **Acceptance:** chat works end-to-end on Vertex Claude.

### Task 5.3: Both apps build cleanly via turbo

```bash
pnpm build
```

Expected: both `@knowsee/marketing` and `@knowsee/market-intelligence` build without errors.

### Task 5.4: Run all tests

```bash
pnpm test
```

Expected: marketing playwright tests pass at baseline. (Market-intelligence has no tests in this plan.)

### Task 5.5: Lint

```bash
pnpm lint
```

Fix any new lint errors.

### Task 5.6: Final commit + tag

```bash
git status
# expected: clean
git tag monorepo-vertical-p0
git log --oneline -20
```

### Task 5.7: Open a draft PR

```bash
git push -u origin monorepo-migration
gh pr create --draft --title "monorepo: turborepo migration + market-intelligence vertical (Vertex Claude)" --body "$(cat <<'EOF'
## Summary
- Turborepo + pnpm workspaces monorepo
- `apps/marketing` = current knowsee.co.uk (Anthropic direct, all features intact)
- `apps/market-intelligence` = new vertical, basic chatbot on Claude via Vertex AI
- Shared packages: `@knowsee/ui`, `@knowsee/chat-shell`, `@knowsee/ai-core`, `@knowsee/artifacts`, `@knowsee/db-chat`, `@knowsee/auth`

## Out of scope (follow-up plans)
- BigQuery tool, Account 360 page, intelligence pages
- Cloud IAP integration
- Cloud Run + Terraform
- Per-app Dockerfiles (dockerise stash to be re-applied)
- `apps/law`, `apps/mitram`

## Test plan
- [ ] `pnpm build` clean
- [ ] `pnpm test` passes at baseline
- [ ] Marketing dev server: chat works, brand audit fires, memory tool fires
- [ ] Market-intelligence dev server: chat works on Vertex Claude

## Verification commands
\`\`\`
pnpm install
pnpm build
pnpm dev:marketing       # http://localhost:3000
pnpm dev:market-intelligence   # http://localhost:3001
\`\`\`
EOF
)"
```

---

## Post-plan: what comes next

Three follow-up plans become possible after this lands:

1. **Re-apply Docker per app** — restore the `dockerise` stash, lift `lib/platform/*` into `packages/platform`, create `apps/marketing/Dockerfile` and `apps/market-intelligence/Dockerfile`, reinstate the 8-test docker harness per app
2. **Market-intelligence P1 features** — BigQuery tool, Account 360 page, intelligence queries, Cloud IAP, Cloud Run deploy
3. **Branding context provider** — `BrandingProvider` in `packages/chat-shell`, per-app branding configs, replace hardcoded greetings/headers

Each is independent of the others.

---

## Critical assessment

**Strengths**

- Mechanical migration first (Phase 2), surgical extraction second (Phase 3). Each phase has a regression gate.
- Shared package boundary is principled (lowest common denominator). Anthropic-only features cannot leak into market-intelligence by accident.
- New vertical is genuinely thin — only provider, identity prompt, and minimal config differ from marketing.
- Plan stops where the user said: working chatbot on Vertex with a different vertical. Nothing more.

**Real risks**

- **Phase 3 has the highest risk of the plan.** Six extractions touching ~150 import sites. Each extraction must verify marketing still runs. If an extraction breaks marketing, revert that single commit and rework — don't proceed downstream.
- **Better-auth in two apps with shared `BETTER_AUTH_SECRET`** may cross sessions if both apps share a domain. For local dev (different ports) it's fine. For production, each app needs its own auth realm or a single canonical auth domain.
- **Vertex AI Claude model availability is region-specific.** "Global" endpoint is recommended in the Anthropic docs, but the user's GCP project must have the specific Claude models enabled in the Model Garden. If Task 5.2 fails with permission errors, that's the cause — not a code bug.
- **The `?raw` markdown import pattern** depends on Next.js/Turbopack support. If it breaks in either app, swap to `fs.readFileSync` at module load.
- **`pnpm test` for market-intelligence** is a no-op in this plan — playwright config is not ported. Adding it is a future task and may surface regressions at that point rather than now.
- **Schema split in Task 3.2** assumes `lib/db/schema.ts` cleanly separates chat from brand tables. If they share columns or foreign-key into each other, the split is harder than this plan suggests. The executor should read the file before splitting and adjust the task in place if needed.

**What this plan does not prove**

- That the market-intelligence vertical will satisfy any specific use case (not its goal — goal is "basic chatbot works on Vertex").
- That the package boundaries are right for the third and fourth verticals (law, mitram). They may demand re-shaping. That's expected — re-shape when you have the second-order evidence.
