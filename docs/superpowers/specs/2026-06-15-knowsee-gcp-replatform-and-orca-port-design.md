# Knowsee-verse: GCP Re-platform + Orca Harness Port — Design

Date: 2026-06-15
Author: Saahil Mehta (with Claude)
Status: Agreed (pilot scope); next step is the implementation plan

## 0. Driver and framing

Knowsee is moving into a **Publicis pilot** (imminent, roughly within a month, **no hard deadline**). The demos are largely done; the goal now is to **stand up the working app** on an enterprise-friendly, reversible footing. **Everything is treated as critical** here: resolve and test cleanly and thoroughly, no corner-cutting against a date.

Knowsee-verse and Orca (`intelligence`) descend from the same Vercel "ai-chatbot" template but share **no git history**. They remain **separate products**. This work is a **one-way port: Orca → knowsee-verse**. This agent **never writes to the `intelligence` repo**; the Orca side of any shared gap is Saahil's to mirror (tracked in `pending.todo.scratchpad.txt`).

The shaping decision: rather than graft Orca features onto a Vercel app, **make knowsee-verse a GCP-native Cloud Run twin of Orca**, minus South Pole data, plus Knowsee's brand features, with the Vercel AI Gateway as the single non-GCP seam. One infra shape, one deploy story, two domains.

## 1. Scope

**In scope**
- Merge `fix/chat-stream-and-export` into knowsee-verse `main` (step 0).
- Re-platform off Vercel/Supabase onto GCP primitives (Cloud Run, Cloud SQL, Memorystore, GCS, Secret Manager, Terraform). Keep **only** the Vercel AI Gateway, for the LLM.
- Port Orca's harness and UX quality (charts, tour, guide, feedback, playbook, lineage, methodology persistence, system-prompt composer, sharing and export harnesses, stream-recovery).
- Add a **BigQuery connector module** (Orca's harness patterns) pointed at **public datasets** for the demo; generalised for client-owned data later.
- Rebrand ported surfaces to Knowsee and **strip all South Pole-specific copy**.
- A `ksve`-prefixed Terraform harness, validated on `sp-data-platform-dev` (apply → exercise → destroy).
- Upgrade knowsee-verse dependencies to match Orca.

**Non-goals**
- Any South Pole data. Pilot data is BigQuery **public datasets** only.
- Vertex AI (kept impossible by the brand tools, see §6). LLM stays the Gateway.
- Touching the `intelligence` repo.
- The actual Publicis production deployment (later; needs only a project id and a Publicis-held key).
- Per-client white-labelling. The product brand is **Knowsee**.
- A semantic layer (parked).

## 2. Architecture (the twin model)

```
                         Vercel AI Gateway  ── first-party Anthropic
                                 │  (the ONE non-GCP dependency)
                                 │
  Browser ──▶  Next.js (App Router, RSC)  on  Cloud Run  (Docker image)
                                 │
        ┌────────────────┬───────┼─────────────────┬──────────────┐
        │                │       │                 │              │
   Cloud SQL        Memorystore  GCS            BigQuery        Mailgun
   (Postgres,       (Redis,      (uploads)      (public         (Knowsee
   Better Auth +    resumable                   datasets,       account,
   app data)        streams)                    later module)   email-OTP)
        │
   Secret Manager (all secrets; resources prefixed `ksve-`)
```

Everything except the LLM is a GCP primitive. Every external/optional capability sits behind a config switch and **fails loud** when misconfigured (§5).

## 3. Step 0 — merge the fix branch

`fix/chat-stream-and-export` is 3 commits ahead of knowsee-verse `main` with **zero conflict surface**. Merge it first (stream-recovery + export fixes).

Note: the branch's export fix uses `@sparticuz/chromium` (a Vercel-Functions approach). Because we are moving to **Docker/Cloud Run**, the image will instead install **system chromium** and the code selects the binary via `PUPPETEER_EXECUTABLE_PATH` (the same env hook already present in `lib/documents/puppeteer.ts`). The `@sparticuz/chromium` path is retired with Vercel hosting.

## 4. Re-platform: Vercel/Supabase → GCP primitives

| Concern | From | To | Notes |
|---|---|---|---|
| Postgres | Supabase (`POSTGRES_URL`) | **Cloud SQL** | Connect over **private IP / TCP**, not the Cloud SQL Unix socket, to avoid the `new URL()` parse failure postgres-js hits on `host=/cloudsql/...` (decompose via `pg-connection-string` if a socket is ever used). Config-switchable connection. |
| Redis | Vercel Redis (`REDIS_URL`) | **Memorystore** | Powers resumable streams. If Redis is disabled by config, resumable streams are **explicitly off and logged**, never silently degraded. |
| Uploads | `@vercel/blob` (one site: `app/(chat)/api/files/upload`) | **GCS** | Behind a small storage interface so the call site is backend-agnostic. |
| Hosting | Vercel | **Cloud Run** via Docker + Cloud Build + Terraform | Remove `vercel.json`, `vercel-template.json`, `proxy.ts`. `next dev` remains for local work. |
| Secrets | mixed | **Secret Manager** (deploys) + `.env.local` (local) | All created resources prefixed `ksve-`. |
| Email | Mailgun (KV's) | **Knowsee Mailgun** | Use Knowsee's own Mailgun account/domain; apply best-practice changes (single mailer module, typed errors, send failures logged loudly, never block the user flow). |

## 5. Configuration and reliability model

**Principle: configuration is the saviour; there are no silent fallbacks.** Every degradation is either a hard failure or an explicit, logged config switch. This matches Orca's "no silent failures" guiding principle.

- **Config sources:** environment variables and Terraform `tfvars`. A single typed config module resolves them once at startup.
- **GCP project id and region** are env/tfvars-controlled and trivially switchable (dev test project → Publicis project).
- **Switches:** `AUTH_MODE` (`sso`|`otp`), data-source mode, storage backend, Redis on/off, LLM provider (Gateway). Each switch's **resolved value is logged at startup**, and mode-relevant operations log which path they took.
- **Fail-loud rule:** a missing or invalid required config throws at startup (or at first use for lazy resources) with a clear message. No feature silently turns itself off.

## 6. Auth (config switch `sso | otp`)

- **`otp` (demo default):** Knowsee's existing Better Auth email + password + one-time-password, via the Knowsee Mailgun.
- **`sso`:** lift Orca's Better Auth Google OAuth and its **per-user token-forwarding** harness (`lib/connectors/bigquery/identity.ts` + `lib/auth.ts`), configured with a **non-SP, env-driven OAuth client** (Knowsee/Publicis consent screen and credentials, never South Pole's).
- The BQ connector's credential source **follows the switch**: forward the signed-in user's OAuth token when `sso`; use the Cloud Run runtime **service account** when `otp` (and for public datasets).

Why the LLM cannot move to Vertex (the permanent reason `sso`/billing does not change it): Knowsee's brand engine depends on **Anthropic server-side web search**, the **multi-provider perception fan-out** (OpenAI/Gemini/Mistral/Haiku through the Gateway), and the **Anthropic memory tool**. Vertex and Bedrock do not support Anthropic server-side tools or the Gateway's multi-provider routing. So the LLM stays first-party Anthropic through the Gateway; "who pays" is solved separately by injecting a Publicis-owned Gateway key in prod.

## 7. BigQuery connector (separate, later module, public data)

Port Orca's `lib/connectors/bigquery/*` **patterns**: deny-list (only `SELECT`/`WITH`/`EXPLAIN`), `dryRun` cost-check before execution, typed error taxonomy, region auto-detection, result-row shaping, lineage logging, and the `identity` credential abstraction. The connector core is plain TypeScript and ports cleanly; the small AI tool input-schemas are re-authored in KV's (upgraded) zod.

- Built as a **self-contained data-source module**, added **after** the re-platform and harness port, so a connector bug cannot take down the core demo flow.
- **Pilot** reads **BigQuery public datasets** via the runtime service account. No SP data, no per-user OAuth.
- Generalised so a client deployment can later point it at the client's own BigQuery, where per-user token forwarding (the `sso` path) reinstates IAM-governed access.

## 8. Port menu (Orca → knowsee-verse)

| Classification | Items |
|---|---|
| **Port wholesale** (rebrand + strip SP copy) | stream-recovery fix, chart primitives + `suggestChartType`, methodology persistence, theme system, product tour, guide page + nav-groups framework, feedback, playbook mechanism, board, lineage (generalised), **export harness**, **sharing harness (ChatShare)** |
| **Port behaviour-only** | system-prompt composer pattern, chat-route structure, web-search trust/anonymisation posture |
| **Preserve (Knowsee-only)** | brand-project, brand-perception / AI-visibility audit, brand-memory (Anthropic memory tool), Vercel AI Gateway transport, branch-and-continue route |
| **Strip / do not port** | all SP-specific surface copy (Antarctica, South Pole, named accounts), SP system-prompt blocks, `@southpole.com` lock, Vertex provider, SP Terraform/Cloud Build/Mailgun-SMTP-secret |

From Orca's `.scratchpad.txt` "to add to knowsee" list, the items not already in the table and worth building: **error boundaries** (an errored route returns the user home, never a white-screen crash), a **data-sources indicator** (a visible surface of which data sources are live, reinforcing the no-silent-fallback posture), Orca's **recharts horizontal/vertical orientation fix**, and **viz / generative-UI via the Anthropic Files API + Programmatic Tool Calling**. The rest of that list (BQ, playbook, board + migration, sharing, Terraform/Dockerise, identity discipline, new greetings) is already covered above; the South Pole P1 data pages in that file do not port.

## 9. Data-model reconciliation

- **Adopt Orca's `ChatShare`** per-user-grant sharing model (it has matured through many fixes). This reconciles knowsee-verse's `Chat.visibility` enum into the `ChatShare` join-table; the migration touches the chat queries, the visibility selector, and the branch route.
- **Preserve knowsee-verse's** `Project`, `BrandProfile`, `Memory`, `VisibilityAudit` tables and their routes/pages unchanged. **Do not** port Orca's hollow `Project` table or its dead `brandProfileSchema`.
- Migrations authored with `pnpm db:generate`, committing each `.sql` **and** its `meta/<idx>_snapshot.json` together (the snapshot-chain gotcha).
- **Greenfield:** knowsee-verse has no production deployment or data yet, so the development database is treated as greenfield (rebuilt, no data migration). A backwards-compatible migration is written only once a pilot or production database holds data to preserve.

## 10. Dependency upgrades

Bring knowsee-verse up to Orca's versions: **zod 3 → 4**, **next 16.0.10 → 16.2.5**, **better-auth 1.4.18 → 1.6.16**, and align the AI SDK. Validate with a green build, type-check, unit and e2e suites before proceeding. Not kept stuck.

## 11. Terraform harness (`ksve`-prefixed)

A new `terraform/environments/ksve/` root provisions, with every resource name prefixed `ksve-`:
- Cloud Run service, Artifact Registry repo, Cloud Build (or manual `docker push`).
- Cloud SQL (Postgres) instance + database; Memorystore (Redis); GCS bucket (uploads).
- Secret Manager secrets (Gateway LLM key, DB URL, Redis URL, OAuth client, Mailgun) and a least-privilege runtime **service account** (Secret accessor + BigQuery `jobUser`/`dataViewer` for public-data reads).
- GCP **project id and region via `tfvars`**.

**Validation as a stretch exercise:** `terraform validate` and `plan` run freely. `terraform apply` runs against `sp-data-platform-dev` (ADC-authed, manual, since the WIF org-policy blocker prevents CI auth) **only after extensive application testing**, then **defers to Saahil**. Once validated, `terraform destroy` tears it all down. No SP data is ever read.

## 12. Rebrand

Knowsee identity (the app is already Knowsee-purple `#6214d9`). Ported Orca surfaces (tour, guide, feedback copy, email templates) are rebranded Orca → Knowsee and **all South Pole references removed**. The product **voice is retailored from Orca's climate / South Pole framing to an advertising and digital-agency register** suited to Knowsee and Publicis: warm, fun, occasionally sarcastic, framed around brands, AI-visibility, agentic commerce, and digital presence rather than carbon or KAM jargon. The visual bar is premium, modern, smooth, intentful, and joyful (Orca's quality standard, carried across).

## 13. CLAUDE.md / AGENTS.md sync

- **Sync (stack-neutral):** debugging philosophy, output policy (UK English, no emojis, no em dashes, ≤72-char commit subjects, never fabricate), the no-silent-fallbacks principle, the Drizzle snapshot-chain gotcha, the `/aikido:scan` pre-commit line, KISS/DRY/YAGNI.
- **Adapt:** AGENTS.md engineering/AI/UI invariants reframed for Knowsee's brand surface and the GCP/Gateway stack.
- **Do not copy:** SP data-marts list, Vertex specifics, `@southpole.com` perimeter, the `relationship_with_knowsee_verse` block, SP project ids and Mailgun-SMTP secret names.

## 14. Testing strategy

- **Unit (Vitest):** config resolution and fail-loud behaviour, the BQ deny-list and dry-run, the storage and mailer interfaces, auth-mode selection.
- **e2e (Playwright):** both auth modes, chat + brand flows, upload via GCS, export, sharing.
- **Switch matrix:** each config switch exercised in both states, asserting **loud failure** (not silent fallback) on misconfiguration.
- Extensive local + dev testing **precedes** any `terraform apply`.

## 15. Build sequence

- **A. Foundation:** merge fix branch; dependency upgrades; green build.
- **B. Re-platform adapters:** config module + startup logging; Cloud SQL, Memorystore, GCS, Knowsee Mailgun adapters; remove Vercel hosting files. App runs locally on GCP-shaped config.
- **C. Harness port + rebrand:** charts, tour, guide, feedback, playbook, lineage, methodology persistence, system-prompt composer, **sharing + export** harnesses; rebrand and strip SP copy.
- **D. BQ connector + auth switch:** the data-source module against public datasets; `sso`/`otp` switch and credential-following.
- **E. Terraform + Docker:** `ksve` harness; `validate`/`plan`; extensive testing; `apply` on dev → validate → **defer to Saahil** → `destroy`.
- **F. Docs:** CLAUDE.md / AGENTS.md sync.

Each phase ends green before the next begins (small increments).

## 16. Deferred decision (for the grill / prod)

For the Publicis production deployment, **whose Anthropic/Gateway account holds the key** (Publicis creates one and we inject it, vs run on Saahil's account and invoice). Commercial, not technical; does not block the pilot. For now the key is Saahil's, in `.env.local` / Secret Manager.

## 17. Critical assessment

- **Largest risk is the re-platform adapter layer plus the dependency upgrade ripple.** zod 3 → 4 across knowsee-verse's existing schemas (not just ported code) can surface breakages well beyond the BQ tool schemas; Next and better-auth minors may shift behaviour. Phase A must end genuinely green, with the full suite, before anything is built on top.
- **The `ChatShare` reconciliation is the riskiest single port:** it changes the `Chat` sharing DDL and touches the branch route and every chat query. It is worth doing (Orca's sharing is battle-tested) but it is not a copy-paste; budget for a real migration.
- **The ephemeral GCP test is genuinely unproven end to end.** Cloud SQL + Memorystore bill while up; the WIF blocker forces manual `apply`; a half-built Terraform could leave `ksve-` resources stranded in `sp-data-platform-dev`. The destroy step must be treated as mandatory, and resources are prefixed precisely so they can be found and removed.
- **Pilot framing removes deadline pressure but raises the thoroughness bar.** There is no hard date (roughly a month out) and everything is treated as critical, so the full GCP stack is built and tested properly rather than trimmed. The risk shifts from scope-versus-deadline to **thoroughness and clean teardown**: each phase must end genuinely green, and the ephemeral `ksve` stack on `sp-data-platform-dev` must be destroyed cleanly after validation so nothing is stranded in the SP project.
- **Unverified:** whether Orca actually has GCS upload to mirror (the scratchpad marks it to verify); the exact shape of knowsee-verse's resumable-stream Redis usage; and how much of knowsee-verse's own code depends on zod 3 semantics. These are checked at the start of the relevant phase, not assumed here.
