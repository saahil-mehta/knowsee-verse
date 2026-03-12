# Brand Intelligence Platform

**Date:** 2026-02-26
**Status:** Approved

## Overview

Knowsee Brand Intelligence is a project-scoped capability layer on top of the existing Knowsee Verse chat application. It introduces the **Brand Project** — a persistent workspace that gates access to specialised research tools unavailable in regular chats. The target buyer is digital agencies who resell brand audits and AI perception analysis to their clients.

Two research capabilities ship in sequence:
1. **Agentic Commerce Readiness Audit** — analyses a brand's website for AI agent compatibility (structured data, APIs, checkout flow, mobile UX, search quality)
2. **AI Brand Perception & Retailer Intelligence** — probes SOTA LLMs and retailer digital shelves to score how AI models and chatbots perceive the brand (future, Phase 6)

## Product Architecture

### Entity Model

```
Brand Project
  ├── Brand Profile (questionnaire data: name, logo, country,
  │   product categories, competitors, target retailers)
  ├── Brand Memory File (internal, machine-optimised, never shown to user)
  ├── Research Chats (project-scoped conversations)
  │   ├── Chat 1: "Agentic commerce audit"
  │   ├── Chat 2: "Retailer chatbot analysis"
  │   └── Chat 3: Follow-up questions
  └── Budget (daily credit cap, usage tracking)
```

### Capability Gating

- **Regular chats** (outside projects): General Knowsee assistant. Tools: `createDocument`, `updateDocument`, `requestSuggestions`, `web_search`, `web_fetch`.
- **Project chats** (inside a Brand Project): Brand-aware Knowsee. All regular tools plus: `brand_audit` (v1), `brand_perception` (future). System prompt is injected with Brand Profile + Memory.

### Research Depth Tiers

| Tier | Execution | Tool Budget | Target |
|------|-----------|------------|--------|
| `quick` | Single-pass, lead agent only | 8 searches, 6 fetches | Fast sanity check |
| `standard` | Multi-turn, lead agent iterates | 15 searches, 10 fetches | Full audit |
| `deep` | Sub-agent fan-out (future) | 50+ searches, 30+ fetches via PTC | Exhaustive research |

### Cost Model

Credits map to actual token/tool usage via Vercel AI Gateway. Each project has a daily credit cap set by its tier. The existing context usage indicator is repurposed as the budget meter. When the cap is hit, research pauses with a clear message.

## Delivery Format

Hybrid approach:
- **Inline streaming** — research progress streams into the chat as it happens (ChainOfThought steps showing pages crawled, findings discovered, phases completing). Builds trust via visible work.
- **Report artifact** — research culminates in a structured `kind: "report"` artifact in the side panel. Multi-page with Recharts visualisations (donut scores, horizontal bars, radar comparisons, severity-grouped recommendations). This is the deliverable agencies present to clients.

Reports are point-in-time snapshots. The Brand Memory File is the living accumulation of intelligence.

## Brand Project UX

### Project Creation Flow

1. User clicks "New Brand Project" in sidebar
2. Project creation page: enter project name → save
3. Project home renders in **empty state** — questionnaire gate blocks chat access

### Questionnaire Gate

The user cannot chat within a project until the Brand Profile is complete. Required fields:

- **Brand name** (text input)
- **Brand website URL** (text input — auto-fetches favicon/logo)
- **Country** (select dropdown)
- **Product categories** (tag input — chips)
- **Key competitors** (tag input — chips)
- **Target retailers** (tag input — chips)

Fields appear with staggered `animate-in` + `fade-in-0` + `slide-in-from-bottom-2`. On save, the form morphs (framer-motion `layout`) into the Brand Profile display card.

### Project Home — Active State

Once the profile is saved:

- **Top: Brand Profile card** — brand logo (fetched from website), name, country flag, categories/competitors/retailers as tag chips, "Edit" ghost button
- **Bottom: Conversations** — "New Chat" button, list of past project chats with title and relative timestamp
- **Empty state:** "Start your first research chat to begin building brand intelligence."

### Research Chat — Progress Streaming

Inside project chats, research progress renders via `ChainOfThought` component (from AI Elements). Each research phase is a step:

```
┌─ Research: Agentic Commerce Audit ──────────┐
│  ✓ Analysing homepage structured data        │
│    schema.org  product-pages                 │
│  ✓ Checking checkout flow                    │
│    5 pages crawled                           │
│  ● Evaluating API surface...                 │
│  ○ Assessing mobile UX                       │
│  ○ Compiling recommendations                 │
└──────────────────────────────────────────────┘
```

Steps transition `pending` → `active` (shimmer) → `complete` (check icon). This coexists with the existing Reasoning component — Claude's internal thinking is separate from the execution progress.

### Report Artifact

Opens in the side panel (same framer-motion spring as existing artifacts). Sections:

- Overall score donut chart (Recharts PieChart with inner label)
- Category scores as horizontal bar charts (colour-coded severity)
- Recommendations grouped by severity (CRITICAL/HIGH/MEDIUM/LOW)
- Radar chart for brand vs competitors (when comparison data is available)
- Sources footer (collapsible list of crawled pages via Sources component)

Target: **multi-page research report (v1)**, evolving to **interactive drill-down (v2)**.

## Data Model

### New Tables

**`Project`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `name` | `varchar(256)` | "Samsung UK" |
| `userId` | `uuid` FK → User | Owner |
| `createdAt` | `timestamp` | |
| `updatedAt` | `timestamp` | |

**`BrandProfile`** (one-to-one with Project)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `projectId` | `uuid` FK → Project | Unique constraint |
| `brandName` | `varchar(256)` | "Samsung" |
| `websiteUrl` | `varchar(512)` | "samsung.com/gb" |
| `logoUrl` | `varchar(512)` | Auto-fetched |
| `country` | `varchar(64)` | "GB" |
| `categories` | `json` | `["Smartphones", "TVs"]` |
| `competitors` | `json` | `["Apple", "LG", "Sony"]` |
| `retailers` | `json` | `["Amazon UK", "Currys"]` |
| `createdAt` | `timestamp` | |
| `updatedAt` | `timestamp` | |

**`ProjectMemory`** (one-to-one with Project)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `projectId` | `uuid` FK → Project | Unique constraint |
| `content` | `text` | Structured markdown, ≤1500 tokens |
| `version` | `integer` | Incremented on each update |
| `lastResearchChatId` | `uuid` FK → Chat | Traceability |
| `createdAt` | `timestamp` | |
| `updatedAt` | `timestamp` | |

### Modified Tables

- **`Chat`**: add `projectId` (`uuid` FK → Project, nullable). `null` = regular chat.
- **`Document`**: `kind` enum expands to include `"report"`.

### Why Separate BrandProfile and ProjectMemory?

Different lifecycles:
- **BrandProfile** is user-authored, changes rarely, structured typed fields. The *input*.
- **ProjectMemory** is machine-authored, changes after every research chat, unstructured markdown. The *accumulated intelligence*.

## Context Management

### Brand Memory File

Internal, never shown to the user. Machine-optimised structured markdown.

**Structure:**

```markdown
# Brand Intelligence — Samsung UK
Updated: 2026-02-26 | Version: 3

## Findings
- Agentic commerce readiness: 53/100 (2026-02-26)
- Schema.org: Product markup on 12% of pages
- Checkout: No API, session-based only

## Retailer Intelligence
[Populated by perception tool — future]

## Active Recommendations
- CRITICAL: JSON-LD Product schema across PDP pages
- HIGH: REST API for product catalogue

## Research Log
- 2026-02-26 Chat 1: Initial audit (14 pages)
- 2026-02-28 Chat 2: Schema.org deep dive (8 pages)
```

**Refresh triggers:**

1. **After research chat completes** — `onFinish` callback runs Haiku summarisation, patches memory with new findings. Async, non-blocking.
2. **User manually triggers** — "Refresh Memory" action (future). Re-summarises across all project chats.
3. **On new chat start** — read only. Current memory injected into system prompt.

**Token budget:** ~200 tokens for BrandProfile + ~800-1500 tokens for memory content = ~2000-2700 tokens total system prompt overhead. Leaves ~197k for conversation.

**Compression strategy:** Haiku prioritises recency and severity. CRITICAL findings always stay. LOW findings get compressed or dropped as the memory grows.

### Separation: Memory File vs Report

| | Brand Memory File | Report Artifact |
|---|---|---|
| **Audience** | Machine (system prompt) | Human (agency deliverable) |
| **Lifecycle** | Accumulates across all chats | Point-in-time snapshot per audit |
| **Storage** | `ProjectMemory` table | `Document` table, `kind: "report"` |
| **Format** | Terse structured markdown | Rich visual (charts, scores, prose) |
| **Updates** | Auto-patched after every research chat | Created on demand per research run |

They stay in sync because they draw from the same source — the research chat findings. The memory is the brain; the report is the face.

## Technical Architecture

### System Prompt Composition

Extends `systemPrompt()` in `lib/ai/instructions/index.ts`:

```ts
systemPrompt({
  selectedChatModel,
  requestHints,
  project?: {
    brandProfile: BrandProfile,
    memory: string,
  }
})
```

When `project` is present, loads `lib/ai/instructions/brand-mode.md` with `{{brand_name}}`, `{{brand_profile}}`, `{{brand_memory}}` interpolation. One file addition to the existing instructions directory. Same `loadInstruction()` pattern.

### Tool Architecture

**Brand Audit** (`lib/ai/tools/brand-audit.ts`):
- Factory pattern matching existing tools: `createBrandAudit({ session, dataStream, brandProfile, memory, depth })`
- Returns a research plan — does NOT call web_search/web_fetch internally
- The lead agent (Claude) executes the plan using existing server tools across steps
- Streams `data-research-step` events via `dataStream.write()` for ChainOfThought rendering

**Why the tool returns a plan, not results:**
Tools cannot call other tools in the AI SDK. The brand_audit tool is a "research planner" — Claude itself is the executor. This means research quality improves automatically as Claude improves.

### Research Execution Flow

```
User: "Run an agentic commerce audit"
  │
  ▼
Claude calls brand_audit tool
  │ → Returns: research plan with phases
  │ → Streams: ChainOfThought steps via dataStream
  │
  ▼
Claude reads plan, executes phases sequentially
  │ → web_search + web_fetch per phase
  │ → Step status updates streamed via dataStream
  │
  ▼
Claude compiles findings → calls createDocument(kind: "report")
  │ → Report artifact opens in side panel
  │
  ▼
onFinish callback:
  │ → Haiku summarises findings → patches ProjectMemory
  │ → Messages persisted as usual
```

### Memory Update Pipeline

In `onFinish` callback when `chat.projectId` is present:

1. Extract research findings from response messages
2. Load current `ProjectMemory`
3. `generateText` with Haiku: merge new findings into existing memory
4. Write updated memory with incremented version

### Step Count and Tool Budget

| Context | stepCount | web_search | web_fetch |
|---------|-----------|------------|-----------|
| Regular chat | 8 | 5 | 3 |
| Project chat (quick) | 12 | 8 | 6 |
| Project chat (standard) | 20 | 15 | 10 |
| Project chat (deep, future) | 30+ | 50+ via sub-agents | 30+ via sub-agents |

### AI Brand Perception (Future — Phase 6)

- **LLM Probing:** Vercel AI Gateway routes to OpenAI, Google, Mistral, etc. Standardised prompts ("Recommend the best smartphone under £1000"). Score brand prominence in responses.
- **Programmatic Tool Calling (PTC):** Claude writes Python that orchestrates batch probing — 50 tool executions in one model round-trip. Code filters, scores, and aggregates locally. Claude receives only the summary.
- **Retailer Digital Shelf:** `web_fetch` audits retailer product pages — search rankings, featured placement, review aggregation, structured data quality.
- **Spending caps:** Hard daily limit per project, enforced in route handler.

## Design Principles

- **AI Elements first** — use Vercel AI Elements components (ChainOfThought, Sources, Artifact, Context) before building custom UI
- **Existing patterns** — same component architecture (primitives → elements → pages), same `cn()` composition, same framer-motion springs
- **Monochromatic palette** — no new brand colours. Charts use existing `--chart-1` through `--chart-5` tokens
- **Instructions are markdown** — `brand-mode.md` in `lib/ai/instructions/`, composed by `index.ts`. No new instruction engine
- **Tools are planners** — tools return strategy, Claude executes. Research quality scales with model capability
- **Memory is invisible** — users never see the Brand Memory File. They see the Brand Profile (their input) and the Report (the deliverable)

## Implementation Phases

| Phase | Scope | Dependency | Sellable? |
|-------|-------|------------|-----------|
| 1. Project Infrastructure | DB, project UX, questionnaire gate, chat routing, system prompt, tool gating | None | Demoable as brand-aware assistant |
| 2. Brand Audit Tool | `brand-audit.ts`, step count increase, `data-research-step` streaming | Phase 1 | First revenue moment |
| 3. Report Artifact | `kind: "report"`, Recharts, report renderer, artifact panel | Phase 2 | The deliverable |
| 4. Project Memory | `onFinish` Haiku summarisation, memory injection, cross-chat intelligence | Phase 1 | Invisible quality upgrade |
| 5. Budget & Credits | Credit mapping, daily caps, `ProjectUsage` table, budget meter UI | Phase 1 | Required before paid clients |
| 6. Brand Perception | Multi-model probing, PTC, retailer analysis, perception reports | Phase 1 + 5 | Second revenue capability |

Phases 2, 3, 4 can run in parallel after Phase 1. Phase 5 ships before onboarding paying clients. Phase 6 is the expansion.

## Critical Assessment

**Strengths:**
- Builds entirely on existing infrastructure (AI SDK tools, streaming, artifacts, instructions)
- No custom orchestration engine — Claude is the executor, improving automatically with model upgrades
- Clean product boundary (free = chat, paid = projects) with natural upsell
- Memory file pattern avoids RAG/vector DB complexity while solving cross-chat context

**Risks:**
- Research quality depends heavily on web_search/web_fetch reliability and Claude's ability to follow multi-phase plans consistently
- The memory summarisation (Haiku) could lose nuance in compression — needs careful prompt engineering and testing
- Report artifact is the most frontend-heavy piece (Recharts integration, multiple chart types) — potential scope creep
- PTC integration for Phase 6 is dependent on Anthropic's API stability and Vercel AI SDK support

**Open Questions:**
- Exact credit-to-token mapping ratios (needs cost modelling with real usage data)
- Whether the questionnaire fields are sufficient or need expansion after agency feedback
- Logo fetching reliability (favicon vs Clearbit vs manual upload fallback)
- Maximum ProjectMemory size before Haiku summarisation degrades
