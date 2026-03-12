# AI Visibility Audit — Demo Design

**Date:** 2026-03-10
**Status:** Approved
**Demo:** Digitas UK (Publicis Groupe) — Friday 2026-03-14

## Strategic Context

### The Opportunity

AI search traffic converts at 4.4x the rate of traditional organic search. Brands are increasingly discovered, recommended, and compared by AI models — ChatGPT, Gemini, Perplexity, Copilot — yet no agency has a systematic way to audit or optimise this visibility. This is a net-new service category that Digitas can own.

### The Proposition to Digitas

Knowsee is not a tool Digitas buys. It's infrastructure Digitas sells.

**What Digitas gets:**
- White-labelled AI Visibility platform under the Digitas brand
- A repeatable, productised service to sell across their entire client portfolio
- Cross-vertical — works for beauty, tech, retail, finance, CPG, any client
- Complements the existing NX Score (human brand perception) with a new dimension (machine brand perception)

**What Knowsee provides behind the scenes:**
- Unlimited development — new capabilities, new audit types, new verticals
- 10x deployment velocity — features ship in days, not quarters
- Unlimited maintenance — monitoring, fixes, infrastructure, scaling
- Bundled support — Knowsee operates as Digitas's embedded engineering team for this product
- Revenue share on client engagements

**How Digitas makes money:**
- Entry-point: AI Visibility Audits as standalone deliverables (lead-gen for larger engagements)
- Retainer: Ongoing AI visibility monitoring and optimisation programmes
- Upsell: Agentic commerce readiness audits, brand perception tracking over time
- Scale: One platform, unlimited clients, minimal Digitas headcount required

**How Knowsee makes money:**
- Retainer or revenue share from Digitas per client engagement
- Platform usage fees (compute, model costs passed through with margin)
- Development velocity as the moat — Digitas can't replicate the engineering speed internally

### Selling Motion

| Phase | Digitas sells | Knowsee powers | Revenue type |
|-------|--------------|----------------|-------------|
| Discovery | AI Visibility Audit | Probe pipeline + report artifact | Per-audit fee |
| Prescription | GEO Playbook | Actionable recommendations from audit findings | Strategy engagement |
| Optimisation | Ongoing GEO programme | Quarterly re-audits showing improvement | Monthly retainer |
| Expansion | Agentic Commerce Readiness | Commerce audit tool (already in build) | Upsell |

Each phase leads naturally to the next. The audit creates urgency ("you're invisible"). The playbook creates dependency ("here's what to fix"). The retainer creates lock-in ("is it working? let's measure").

### Internal Intel

From a contact inside Digitas, two things resonate with the Digitas crowd:

1. **Ease of use** — non-technical strategists can run audits without engineering support. The tool disappears behind the conversation.
2. **Influencing LLMs** — actionable guidance on how to make AI models recommend a client's brand over competitors. The audit diagnoses visibility; the GEO playbook prescribes fixes.

### The Demo Moment

Live audit on a known Digitas client. The room sees the full client-facing experience: brand setup → AI models queried live → branded report artifact. Then the conversation shifts: "This is your tool. We build it, you sell it. Here's the revenue model."

---

## Demo Flow

### Act 1: "Let me show you what we built" (~2 minutes)

1. Open Knowsee. Create a new Brand Project — "Client Name UK"
2. Type the brand name into the search field → auto-enrichment kicks in
3. Brand profile populates: logo, country, categories, competitors, retailers
4. Quick edit if needed → save
5. You're in the project. "Let's run an AI visibility audit."

### Act 2: "Your client is invisible to AI" (~3 minutes)

1. Type: "Run an AI visibility audit for [brand]"
2. ChainOfThought streams progress:
   ```
   ✓ Generating probe prompts for [categories]
   ✓ Querying ChatGPT GPT-4o-mini (20 prompts)
   ✓ Querying Google Gemini 2.0 Flash (20 prompts)
   ● Analysing responses...
   ○ Scoring visibility
   ○ Compiling report
   ```
3. Claude narrates key findings as they emerge — "interesting, ChatGPT recommends [competitor] in 14 out of 20 queries but only mentions [brand] twice..."
4. Report artifact slides open in the side panel

### Act 3: "Here's the deliverable your team would present" (~3 minutes)

1. The report artifact is the centrepiece (see Report Artifact section)
2. "This accumulates over time — every audit builds the brand memory, so next month we can show improvement"
3. "And this is just one capability. The platform also does agentic commerce readiness audits — how ready is the website for AI agents to shop on it."

**The close:** "We white-label this for your team. Your strategists run these for clients, Digitas bills for the insight. We handle all development, deployment, and maintenance behind the scenes."

---

## AI Visibility Pipeline

### Overview

The pipeline probes multiple AI models with purchase-intent prompts, analyses responses for brand presence and positioning, and produces a structured intelligence summary that Claude synthesises into a report with GEO recommendations.

### Architecture

```
Claude (Sonnet) orchestrates:
  │
  ├── 1. Calls brand_perception tool
  │      → Returns research plan based on brand profile
  │
  ├── 2. Executes plan via PTC
  │      Claude writes code that:
  │      ├── Generates category-specific probe prompts
  │      ├── Fires probes at external models (parallel)
  │      │   ├── GPT-4o-mini (via @ai-sdk/openai)
  │      │   ├── Gemini 2.0 Flash (via @ai-sdk/google)
  │      │   └── Perplexity Sonar (via perplexity API)
  │      ├── Runs analysis per response
  │      │   ├── Self-written parsing (regex, structural)
  │      │   └── Haiku calls for nuanced extraction
  │      │       (sentiment, reasoning, accuracy, positioning)
  │      ├── Aggregates into structured summary
  │      └── Returns ~500 tokens of compressed intelligence
  │
  ├── 3. Receives summary only (context stays lean)
  │
  └── 4. Synthesises narrative + GEO recommendations
         → createDocument(kind: "report")
```

### Model Roster

Server-side configuration. Operator-controlled, not user-facing. Swap models without code changes or UI updates.

```typescript
// lib/ai/perception/models.ts
const PROBE_MODELS = [
  { id: 'gpt-4o-mini', provider: 'openai', label: 'ChatGPT GPT-4o-mini' },
  { id: 'gemini-2.0-flash', provider: 'google', label: 'Google Gemini 2.0 Flash' },
  { id: 'sonar', provider: 'perplexity', label: 'Perplexity Sonar' },
  { id: 'mistral-small-latest', provider: 'mistral', label: 'Mistral Small' },
] as const;
```

One file change to add or swap models. Reports display the label field so the reader knows exactly which model was queried.

### Probe Prompt Generation

Based on brand profile fields (categories, competitors, country), Claude generates ~20 purchase-intent prompts per audit:

- Category discovery: "best [category] in [country]"
- Comparison: "[brand] vs [competitor] for [category]"
- Recommendation: "recommend a [category] for [use case]"
- Purchase intent: "where to buy [category] online [country]"

Prompts are tailored per vertical — Claude adapts automatically from the brand profile.

### Three-Tier Analysis

**Tier 1: PTC-generated scripts (free)**

Claude writes its own analysis code within PTC — regex, structural parsing, keyword matching. No pre-built deterministic scripts to maintain. The analysis adapts per brand and vertical automatically. For a skincare brand, Claude might check ingredient mentions. For a SaaS brand, it checks feature comparisons and pricing accuracy.

**Tier 2: Haiku fan-out (cheap)**

Each probe response gets a Haiku call for nuanced extraction that code cannot do:
- Sentiment and recommendation strength (1-5 scale)
- Reasoning — why the model recommended/excluded the brand
- Factual accuracy of claims about the brand
- Brand positioning (premium, value, specialist, mainstream)
- Competitive framing (favourable, neutral, unfavourable)

~200 tokens in, ~100 tokens out per call. 80 calls total: ~$0.015.

**Tier 3: Sonnet synthesis (one call)**

Receives only the aggregated intelligence (~500 tokens). Writes the full narrative, GEO playbook, and generates the report artifact. ~$0.05.

### Cost Per Audit

| Component | Calls | Cost |
|-----------|-------|------|
| Probe generation (Haiku) | 1 | ~$0.001 |
| Model probing (cheapest tier per provider) | 60–80 | ~$0.05 |
| Haiku extraction (fan-out) | 60–80 | ~$0.015 |
| Sonnet synthesis | 1 | ~$0.05 |
| **Total** | | **~$0.12** |

---

## Report Artifact — Iframe Sandbox

### Why Iframe

The existing artifact system uses typed renderers per kind (ProseMirror for text, CodeMirror + Pyodide for code, React Data Grid for sheets). This works for structured formats but breaks down for reports:

- Current renderer cannot stream rich content properly
- No flexibility for varying report layouts per audit
- No path to DOCX/PPTX rendering
- Adding each new format requires a new custom renderer

The iframe sandbox solves all of these. Claude generates a self-contained React component; the iframe renders it. The report layout adapts to the findings. Future formats (DOCX, PPTX) become Claude Skills that render in the same iframe.

### Coexistence With Existing Artifacts

The report kind registers alongside existing kinds. No changes to other artifact types.

```
artifacts/
├── code/client.tsx      ← Pyodide (unchanged)
├── text/client.tsx      ← ProseMirror (unchanged)
├── sheet/client.tsx     ← Data Grid (unchanged)
├── image/client.tsx     ← Base64 (unchanged)
└── report/client.tsx    ← NEW: iframe sandbox
```

### Iframe Implementation

```
┌─ Parent (Knowsee) ──────────────────────────┐
│                                              │
│  artifact.tsx dispatches kind="report"       │
│       │                                      │
│       ▼                                      │
│  report/client.tsx                           │
│       │                                      │
│       ├── Receives data-reportDelta stream   │
│       ├── Accumulates React component code   │
│       ├── Injects brand CSS tokens           │
│       └── Posts code to iframe via postMessage│
│                                              │
│  ┌─ iframe (sandboxed) ──────────────────┐  │
│  │  sandbox="allow-scripts"              │  │
│  │  (NO allow-same-origin)               │  │
│  │                                       │  │
│  │  Pre-loaded:                          │  │
│  │  ├── React 19                         │  │
│  │  ├── Recharts                         │  │
│  │  ├── Lucide Icons                     │  │
│  │  └── Tailwind (runtime)               │  │
│  │                                       │  │
│  │  On postMessage:                      │  │
│  │  ├── Receives component code          │  │
│  │  ├── Transpiles (Sucrase)             │  │
│  │  ├── Renders into DOM                 │  │
│  │  └── Re-renders on each delta         │  │
│  └───────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### Security

- `sandbox="allow-scripts"` only — no `allow-same-origin`, so the iframe cannot access parent cookies, localStorage, or DOM
- Communication strictly via `postMessage` with a typed message schema
- No network access from within the iframe
- Libraries bundled into the iframe HTML, not loaded from CDN at runtime

### Streaming

Claude streams React code via `data-reportDelta` parts. The `onStreamPart` handler in `report/client.tsx` accumulates the code and posts updates to the iframe. The iframe transpiles and re-renders on each update. The report builds visually as Claude writes it.

### Report Structure

**Header:**
- Client logo (from brand profile) + Knowsee branding + audit date
- Overall AI Visibility Score as a donut chart (Recharts PieChart with inner label showing score and grade)
- One-line verdict

**Section 1: Model Breakdown**
- Horizontal bar chart — one bar per model
- Each bar shows mention rate as percentage
- Colour-coded: red (<20%), amber (20–50%), green (>50%)

**Section 2: Category Ownership**
- Radar chart — brand vs top 3 competitors across product categories
- Exposes where the brand owns a category and where competitors dominate

**Section 3: Competitive Position**
- Stacked horizontal bars — average recommendation position per competitor
- Brand highlighted, competitors muted

**Section 4: Blind Spots**
- Categories where mention rate is <10%
- Models where the brand is absent

**Section 5: GEO Playbook (Recommendations)**
- Grouped by impact tier (HIGH / MEDIUM / LOW)
- Each recommendation: what to do, why it matters, expected effect
- Specific, actionable guidance for influencing LLM recommendations

**Section 6: Sources**
- Collapsible — probe prompts used, models queried, timestamp

### Branding

For the demo, Knowsee branding with the client's logo. Digitas branding applied post-demo when their assets are provided. Brand styling (client-specific colours, fonts) is a future capability where the LLM could generate and apply styling from uploaded guidelines — not in scope for this demo.

---

## Data Model

### New Tables

**`ProbeModel`** (server-managed roster)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `modelId` | `varchar(128)` | `"gpt-4o-mini"` |
| `provider` | `varchar(64)` | `"openai"` |
| `label` | `varchar(128)` | `"ChatGPT GPT-4o-mini"` (full model identity) |
| `active` | `boolean` | Toggle models without deletion |
| `createdAt` | `timestamp` | |

**`VisibilityAudit`** (audit results, one per run)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `projectId` | `uuid` FK → Project | |
| `chatId` | `uuid` FK → Chat | Which conversation triggered it |
| `overallScore` | `integer` | 0–100 |
| `modelResults` | `json` | Per-model breakdown |
| `categoryResults` | `json` | Per-category ownership scores |
| `competitorResults` | `json` | Competitor positioning data |
| `recommendations` | `json` | GEO playbook items |
| `probeCount` | `integer` | Number of prompts used |
| `modelsQueried` | `json` | Which models were probed |
| `createdAt` | `timestamp` | |

### Modified Tables

- **`Document`**: `kind` enum adds `"report"`

### Why Store Audit Results Separately?

The report artifact (Document table) is the rendered deliverable. The VisibilityAudit table stores the raw structured data — scores, breakdowns, competitor positions. This enables:

- Trend tracking: "your visibility improved from 31 to 47 since last quarter"
- Cross-audit comparison without re-parsing report content
- Brand Memory updates from structured data, not from scraping the report

---

## Implementation Phases

### Phase 1: Iframe Sandbox

Add the `report` artifact kind with a sandboxed iframe renderer.

**Scope:**
- `artifacts/report/client.tsx` — iframe shell with React 19 + Recharts + Lucide bundled
- `artifacts/report/server.ts` — server-side artifact handler
- `data-reportDelta` stream part type in `lib/types.ts`
- `onStreamPart` handler that accumulates React code and posts to iframe via `postMessage`
- Iframe HTML template with transpiler (Sucrase) for JSX → JS conversion
- Register `kind: "report"` in artifact system
- Knowsee branding applied as default styling

**Does not include:** brand guideline upload, DOCX/PPTX export, client-specific styling beyond logo.

### Phase 2: Brand Perception Tool

The intelligence pipeline that probes external models and scores visibility.

**Scope:**
- `lib/ai/tools/brand-perception.ts` — tool definition, factory pattern matching existing tools
- `lib/ai/perception/models.ts` — server-side model roster config
- `lib/ai/perception/types.ts` — probe result types, score types
- Provider configuration for OpenAI, Google, Perplexity (API keys in env)
- PTC execution: Claude writes probe + analysis code, Haiku fan-out for nuanced extraction
- `data-research-step` streaming for ChainOfThought progress display
- Tool gated to project chats only (same pattern as `brand_audit`)

**Does not include:** user-facing model selection, scheduled re-audits, trend comparison.

### Phase 3: Database + Persistence

Store audit results for trend tracking and memory updates.

**Scope:**
- `ProbeModel` and `VisibilityAudit` tables in `lib/db/schema.ts`
- Migration generation and application
- Queries in `lib/db/queries.ts` for saving/retrieving audits
- `onFinish` callback: persist audit results + update Brand Memory with visibility findings

### Phase 4: Demo Polish

End-to-end flow hardening for Friday.

**Scope:**
- Pre-run audit on target client as backup (stored in DB, report artifact saved)
- ChainOfThought step labels tuned for demo pacing
- Report layout prompt engineering — ensure Claude generates clean Recharts components
- System prompt additions in `brand-mode.md` for perception context
- Dry-run the full flow end-to-end

---

## Critical Assessment

**Strengths:**
- Iframe sandbox is a one-time investment that unlocks every future artifact format for free
- PTC pipeline keeps costs negligible (~$0.12 per audit) while producing genuinely novel intelligence
- The GEO playbook angle transforms a diagnostic tool into an ongoing revenue stream for Digitas
- Model roster is operator-controlled — swap in new SOTA models without touching code or UI
- Builds entirely on existing infrastructure (brand projects, tool gating, streaming, artifacts)
- Ease of use is inherent — a strategist types a sentence and gets a branded report

**Risks:**
- Iframe sandbox is the critical path — if transpilation or streaming breaks, there's no report for the demo. Mitigation: pre-computed backup report saved as a document artifact
- PTC reliability in production is unproven at this scale in the codebase. Mitigation: simplified direct-call fallback if PTC doesn't cooperate
- External model API keys need provisioning (OpenAI, Google, Perplexity) — if any provider has signup friction, reduce to 2 models for demo
- Claude's React code generation quality varies — the report prompt engineering needs iteration to produce consistently clean Recharts output

**Open Questions:**
- Exact revenue share model between Knowsee and Digitas (commercial, not technical)
- Whether Digitas wants their branding applied before or after the demo (need their assets if before)
- Maximum number of probe prompts before diminishing returns (20 assumed, needs empirical testing)
- Whether PTC is available through the current Vercel AI SDK provider or requires direct Anthropic API calls
