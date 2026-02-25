# Knowsee Ads — Product Design Document

**Date:** 2026-02-25
**Status:** In Progress — Brainstorming Phase

---

## Strategic Context

### Why This Exists

Ryze AI (get-ryze.ai) is a US-based AI copilot for performance marketing — audits accounts, optimises bids/budgets, tests creatives, generates reports across Google Ads, Meta, LinkedIn, ChatGPT, and Perplexity. They had 230+ customers and $50M+ managed ad spend.

**Critical context:** Ryze's founder publicly stated Claude "killed" their startup. Their conversion rate collapsed from 70% to 20% after Anthropic and Manus shipped advertising connectors. They are pivoting to complex agency workflows from a position of weakness.

### Strategic Decision

**Option chosen:** Build and Surpass (Option 3) with UK-first positioning (Option 1 lens).

- **Option 1 (UK competitor):** Safe but small. Good positioning lens but not the whole strategy.
- **Option 2 (50/50 partnership with Ryze):** Rejected. Ryze is struggling, their moat evaporated, and open-source MCP ecosystem provides everything they offer for free. Poor economics.
- **Option 3 (Build + surpass):** Chosen. Own 100% of product and revenue. Open-source MCP servers provide the ad platform connectivity. Knowsee Verse provides the foundation. Claude is the competitive advantage — the very technology that killed Ryze.

### Pricing Model

**Hybrid** — subscription base + usage overage (Vercel-style model). Determined by model routing strategy:
- Haiku for routine tasks (audits, reporting, monitoring)
- Sonnet for optimisation and strategy suggestions
- Opus reserved for high-value strategic analysis (agency tier)

---

## Section 1: Product Identity and Positioning

**Product name:** Knowsee Ads
**Domain:** knowsee.co.uk
**One-liner:** AI-powered ad management for UK agencies — audits, optimises, and reports across Google and Meta, so lean teams can manage more clients with less effort.

### Target Segments (Go-to-Market Order)

1. **Solo marketers / small businesses** — free tier, self-serve, Haiku-powered audits
2. **Freelance PPC consultants** — Pro tier, managing 5-15 client accounts
3. **UK marketing agencies** — Agency tier, 50+ accounts, team features, white-label reporting

### Positioning vs Ryze

- UK-first, UK data residency, GDPR-native
- Built on Claude (the technology that killed Ryze's moat) rather than competing with it
- Artifact-driven deliverables — campaign reports, strategy docs, creative briefs are first-class outputs
- Transparent hybrid pricing vs Ryze's opaque model

### Core Value Proposition by Segment

| Segment | Pain | Knowsee Ads solves it by... |
|---|---|---|
| Solo marketer | "I'm wasting ad spend but don't know where" | Free audit with actionable fixes |
| PPC consultant | "I spend 60% of my time on reporting, not strategy" | Automated reports as artifacts, AI-driven optimisation suggestions |
| Agency | "We're managing 80 accounts with 3 people" | Multi-account orchestration, batch audits, client-ready deliverables |

---

## Section 2: Architecture

### Design Principles

1. **No Claude Skills scaffolding** — claude-ads is pure prompt engineering for CLI. We extract the domain knowledge (checks, weights, benchmarks) into structured JSON and build proper tools + scoring engine.
2. **Generative UI via existing parts pattern** — Knowsee Verse already implements the production-recommended Vercel AI SDK pattern (tools return data, client renders components via `message.parts`). We extend it with new tool/component pairs.
3. **MCP servers for connectivity** — we don't build ad platform API integrations; we plug in open-source MCP servers.
4. **Model routing for cost control** — the business model lives in the middleware.

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Knowsee Ads (Next.js 16)                     │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  Chat UI     │  │  Artifacts   │  │  Agency Dashboard     │ │
│  │  (existing)  │  │  (existing)  │  │  (new — multi-acct)   │ │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────┘ │
│         │                 │                      │              │
│  ┌──────┴─────────────────┴──────────────────────┴───────────┐ │
│  │              Vercel AI SDK v6 — Tool System                │ │
│  │                                                            │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐ │ │
│  │  │ Ad Tools    │  │ Artifact     │  │ Model Router     │ │ │
│  │  │ (audit,     │  │ Tools        │  │ (Haiku/Sonnet/   │ │ │
│  │  │  optimise,  │  │ (existing +  │  │  Opus based on   │ │ │
│  │  │  report)    │  │  report      │  │  task complexity) │ │ │
│  │  │             │  │  templates)  │  │                  │ │ │
│  │  └──────┬──────┘  └─────────────┘  └──────────────────┘ │ │
│  └─────────┼──────────────────────────────────────────────────┘ │
│            │                                                     │
│  ┌─────────┴──────────────────────────────────────────────────┐ │
│  │                    MCP Server Layer                         │ │
│  │                                                            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │ │
│  │  │ Google Ads   │  │ Meta Ads     │  │ Future:        │  │ │
│  │  │ MCP Server   │  │ MCP Server   │  │ LinkedIn,      │  │ │
│  │  │ (Official)   │  │ (pipeboard)  │  │ TikTok, etc.   │  │ │
│  │  └──────┬───────┘  └──────┬───────┘  └────────────────┘  │ │
│  └─────────┼─────────────────┼────────────────────────────────┘ │
└────────────┼─────────────────┼──────────────────────────────────┘
             │                 │
     ┌───────┴───────┐ ┌──────┴────────┐
     │  Google Ads   │ │  Meta Marketing│
     │  API          │ │  API           │
     └───────────────┘ └───────────────┘
```

### Layer 1: Ad Platform Connectivity (MCP Servers)

MCP servers handle all ad platform API communication. We integrate, not build:

- **Google Ads**: `google-marketing-solutions/google_ads_mcp` (Official Google, read-only initially)
- **Meta Ads**: `pipeboard-co/meta-ads-mcp` (campaign analysis, budget optimisation)

These expose tools like `get_campaigns`, `get_ad_performance`, `get_keywords`, `get_search_terms` that our intelligence layer calls.

### Layer 2: Intelligence Layer (Tools + Scoring Engine)

Three categories of tools, all in `lib/ai/tools/`:

**Audit Tools** — Pull data via MCP, evaluate against structured checks, compute weighted scores:
- `auditAccount` — full account audit (Haiku gathers data, Sonnet evaluates)
- `auditCampaign` — single campaign deep-dive
- `quickWins` — surface Critical/High severity fixes with <15 min remediation

**Optimisation Tools** — AI-driven recommendations:
- `optimiseBids` — bid strategy analysis and recommendations
- `cleanSearchTerms` — identify wasted spend on irrelevant searches
- `suggestCreatives` — creative improvement suggestions

**Reporting Tools** — Generate deliverables:
- `generateReport` — campaign performance report (renders as artifact in side panel)
- `showMetrics` — inline dashboard cards in chat
- `showChart` — inline chart visualisations in chat
- `showAuditScore` — scorecard with weighted grades

### Layer 3: Scoring Engine (TypeScript, not LLM)

The 186 audit checks from claude-ads are extracted into structured JSON and evaluated programmatically:

```typescript
// lib/ads/scoring.ts
interface AuditCheck {
  id: string;           // e.g. "G42"
  name: string;         // "Conversion actions defined"
  platform: Platform;   // "google" | "meta"
  severity: Severity;   // "critical" | "high" | "medium" | "low"
  category: string;     // "conversion_tracking" | "wasted_spend" | etc.
  evaluate: (data: AccountData) => CheckResult;  // programmatic evaluation
}

// Scoring formula (from claude-ads):
// S = Sum(C_pass × W_sev × W_cat) / Sum(C_total × W_sev × W_cat) × 100
// W_sev: Critical=5.0, High=3.0, Medium=1.5, Low=0.5
// Grades: A (90-100), B (75-89), C (60-74), D (40-59), F (<40)
```

**Why programmatic, not LLM?** Deterministic scoring that's consistent, fast, and doesn't consume tokens. The LLM's role is interpreting results and generating recommendations — not doing arithmetic.

### Layer 4: Model Router (Cost Control Middleware)

```
// lib/ai/middleware/model-router.ts
// Sits in existing wrapLanguageModel middleware chain

Haiku 4.5  ($0.25/$1.25 per M tokens)
  → Data gathering and formatting
  → Search term cleaning
  → Routine monitoring checks
  → Basic Q&A about account data

Sonnet 4.6 ($3/$15 per M tokens)
  → Optimisation recommendations
  → Creative suggestions
  → Report narrative generation
  → Audit result interpretation

Opus 4.6   ($15/$75 per M tokens)
  → Cross-platform strategy (Agency tier only)
  → Budget reallocation across accounts
  → Quarterly business reviews
  → Complex multi-step analysis
```

### Layer 5: Generative UI (Tool → Component Pairs)

Uses Knowsee Verse's existing `message.parts` pattern. Each new tool gets a corresponding React component:

| Tool | Data Shape | React Component | Renders As |
|---|---|---|---|
| `showAuditScore` | `{overall, grade, categories[]}` | `<AuditScoreCard>` | Radial gauge + category breakdown |
| `showMetrics` | `{metrics: [{label, value, trend}]}` | `<MetricsGrid>` | Grid of KPI cards with trend arrows |
| `showChart` | `{type, title, data[]}` | `<ChartCard>` | Recharts bar/line/pie |
| `showQuickWins` | `{wins: [{check, severity, fix}]}` | `<QuickWinsTable>` | Priority table with severity badges |
| `generateReport` | Full markdown report | Artifact (existing system) | Side panel document |
| `showSearchTerms` | `{terms: [{term, cost, action}]}` | `<SearchTermsTable>` | Interactive table with bulk actions |

**Extension points in existing codebase:**
- Add tool types to `ChatTools` in `lib/types.ts`
- Add `part.type` cases to `components/message.tsx`
- Add custom data types to `CustomUIDataTypes` for streaming deltas
- Register new artifact kinds in `components/artifact.tsx` if needed

**Reference implementations to leverage:**
- [Vercel json-render](https://github.com/vercel-labs/json-render) — 36 pre-built shadcn components from JSON specs
- [Vercel AI Elements](https://vercel.com/changelog/introducing-ai-elements) — 20+ production-ready AI interface components

### Layer 6: Agency Features (Post-MVP)

- Multi-account selector and batch operations
- Client workspaces with white-label reporting
- Team permissions (extend existing NextAuth)
- Usage metering and billing (Stripe integration)

### Data Model Extensions

New tables added to existing Drizzle schema (`lib/db/schema.ts`):

```
ad_accounts        — connected Google/Meta accounts per user
                     (platform, account_id, oauth_tokens, user_id)

audit_history      — past audit results with scores
                     (account_id, score, grade, check_results JSONB, created_at)

usage_tracking     — model calls per user per tier for billing
                     (user_id, model, input_tokens, output_tokens, created_at)

check_definitions  — 186 structured checks (seeded from JSON, versioned)
                     (id, platform, severity, category, name, criteria JSONB)

industry_templates — campaign templates by vertical
                     (industry, platform_mix JSONB, benchmarks JSONB)
```

### Layer 7: Context Management and Compaction

**Problem:** Ad management generates massive context — a single audit pulls data for hundreds of campaigns, thousands of keywords, and tens of thousands of search terms. Knowsee Verse currently has zero context management (full history pass-through to model). Vercel AI SDK has no built-in compaction.

**Strategy:** Three layers of defence, plus visibility.

#### 7a. `toModelOutput()` — Separate UI Data from Model Context (Highest Impact)

Every ad tool uses `toModelOutput()` to decouple what the UI renders from what the model sees:

```typescript
// lib/ai/tools/clean-search-terms.ts
export const cleanSearchTerms = tool({
  description: 'Analyse search terms for wasted spend',
  parameters: z.object({ accountId: z.string() }),
  execute: async ({ accountId }) => {
    const terms = await mcp.getSearchTerms(accountId); // may return 5,000 rows
    return { terms, totalCount: terms.length, wastedSpend: calculateWaste(terms) };
    // ↑ Full data → UI renders <SearchTermsTable> with all 5,000 rows
  },
  toModelOutput: ({ output }) => ({
    type: 'text',
    value: `Found ${output.totalCount} search terms. Wasted spend: £${output.wastedSpend}. Top 10 wasters: ${output.terms.slice(0, 10).map(t => t.term).join(', ')}`,
    // ↑ Model only sees a compact summary — saves thousands of tokens
  }),
});
```

#### 7b. `pruneMessages()` — Strip Structural Bloat

Applied in the route handler before passing messages to the model:

```typescript
// app/(chat)/api/chat/route.ts
import { pruneMessages } from 'ai';

const prunedMessages = pruneMessages({
  messages: modelMessages,
  reasoning: 'before-last-message',       // keep only latest reasoning
  toolCalls: 'before-last-2-messages',    // strip old tool call details
  emptyMessages: 'remove',
});
```

#### 7c. Custom Compaction via `prepareStep()` — Haiku-Powered Summarisation

When message count exceeds a threshold, use Haiku (cheapest model) to summarise older messages:

```typescript
// lib/ai/middleware/compaction.ts
prepareStep: async ({ messages, stepNumber }) => {
  if (messages.length < 30) return {};  // under threshold, pass through

  const olderMessages = messages.slice(0, -15);
  const recentMessages = messages.slice(-15);

  const { text: summary } = await generateText({
    model: haiku,  // cheap — ~£0.001 per summarisation
    prompt: `Summarise this ad management conversation concisely, preserving all account data, audit scores, and action items:\n${JSON.stringify(olderMessages)}`,
  });

  return {
    system: `Previous conversation summary:\n${summary}`,
    messages: recentMessages,
  };
},
```

**Known limitation:** `prepareStep` message overrides have a bug where modifications are not preserved between steps (vercel/ai#9631). Monitor and work around if needed.

#### 7d. `<Context>` Component — Token Usage Visibility

Integrate the AI Elements `<Context>` component from `/Users/saahil/Documents/GitHub/ai-elements`:

- **File:** `packages/elements/src/context.tsx`
- **What it does:** Compound component showing context window %, token breakdown (input/output/reasoning/cached), and cost estimation via `tokenlens`
- **Why it matters:** Transparency builds trust on paid tiers — users see exactly what they're consuming
- **Integration point:** Add to chat header, fed by `LanguageModelUsage` from `streamText` response

#### 7e. `<ChainOfThought>` Component — Audit Progress Visualisation

Wire the existing `components/ai-elements/chain-of-thought.tsx` into audit tool rendering:

```
✓ Fetching Google Ads account data          (complete)
✓ Analysing 74 audit checks                 (complete)
● Calculating weighted score...             (active)
○ Generating recommendations                (pending)
○ Building report artifact                  (pending)
```

- **Already in codebase** but not connected to message renderer
- **Integration point:** Render as part of audit tool output in `message.tsx`
- **Fits naturally** with the tool parts pattern — audit tool streams progress updates

#### Existing Assets (Already in Codebase)

| Component | Path | Status |
|---|---|---|
| Reasoning (collapsible thinking) | `components/elements/reasoning.tsx` | Active, wired to message renderer |
| Reasoning (AI Elements, enhanced) | `components/ai-elements/reasoning.tsx` | Active, with Streamdown markdown |
| Chain of Thought | `components/ai-elements/chain-of-thought.tsx` | Exists but NOT wired to message renderer |
| Context (AI Elements) | External: `ai-elements/packages/elements/src/context.tsx` | Needs integration |

### Build vs Reuse Matrix

| Component | Action | Source |
|---|---|---|
| Chat interface | **Reuse** | Knowsee Verse existing |
| Artifact system | **Extend** | Add report templates, campaign brief templates |
| Streaming infrastructure | **Reuse** | Existing `createUIMessageStream` pipeline |
| Google Ads connectivity | **Integrate** | google_ads_mcp (Official Google MCP) |
| Meta Ads connectivity | **Integrate** | pipeboard-co/meta-ads-mcp |
| Audit check definitions | **Extract** | claude-ads markdown → structured JSON |
| Scoring engine | **Build** | TypeScript implementation of weighted formula |
| Model routing middleware | **Build** | New middleware in `lib/ai/middleware/` |
| Context window visibility | **Integrate** | AI Elements `<Context>` component |
| Chain of Thought (audit progress) | **Wire up** | Already in codebase, needs message.tsx integration |
| Compaction middleware | **Build** | `prepareStep()` + Haiku summarisation |
| Generative UI components | **Build** | New components in `components/elements/` |
| Agency dashboard | **Build** | New routes + components |
| Auth + team permissions | **Extend** | Existing NextAuth + org/team layer |
| Usage metering + billing | **Build** | Stripe integration + usage tracking |
| Database schema | **Extend** | New tables in existing Drizzle schema |

---

## Section 3: Pricing Tiers

*To be written*

---

## Section 4: Launch Scope and Platform Roadmap

### Launch Platforms (MVP)

- **Google Ads** — UK agencies' bread and butter
- **Meta Ads** — covers ~80% of UK digital ad spend alongside Google

### Integration Roadmap (Post-Launch)

| Priority | Platform | Rationale | Open-Source MCP Available |
|---|---|---|---|
| P1 (Launch) | Google Ads | Core UK agency platform | Yes — google-marketing-solutions/google_ads_mcp (Official) |
| P1 (Launch) | Meta Ads | Second-largest UK ad spend | Yes — pipeboard-co/meta-ads-mcp |
| P2 (Month 2-3) | LinkedIn Ads | B2B angle, massive in UK professional services. Agency tier differentiator | Yes — via synter-mcp-server |
| P3 (Month 4-5) | TikTok Ads | Growing UK spend, younger demographics | Yes — via amekala/ads-mcp |
| P4 (Month 6+) | Microsoft/Bing Ads | Smaller UK share but relevant for B2B | Yes — via synter-mcp-server |
| P5 (Month 6+) | Reddit Ads | Niche but growing | Yes — via synter-mcp-server |
| Future | ChatGPT / Perplexity Ads | AI search ads — emerging channel | No mature MCP yet |
| Future | Amazon Ads | E-commerce vertical | Yes — amekala has Amazon MCP |
| Future | X (Twitter) Ads | If demand warrants | Yes — via synter-mcp-server |

### Key Open-Source Building Blocks

| Component | Repository | Purpose |
|---|---|---|
| Google Ads MCP (Official) | google-marketing-solutions/google_ads_mcp | LLM ↔ Google Ads API |
| Ads MCP (Multi-platform) | amekala/ads-mcp | 100+ tools, Google + Meta + LinkedIn + TikTok |
| Synter MCP (7 platforms) | jshorwitz/synter-mcp-server | Cross-platform: Google, Meta, LinkedIn, Reddit, Microsoft, TikTok, X |
| Meta Ads MCP | pipeboard-co/meta-ads-mcp | Meta/Instagram campaign analysis, budget optimisation |
| Claude Ads Skill | AgriciDaniel/claude-ads | 186 audit checks, weighted scoring, industry templates |
| Awesome Agentic Advertising | jshorwitz/awesome-agentic-advertising | Curated directory of all MCP servers in this space |

---

## Section 5: Implementation Plan

**Goal:** Build an MVP of Knowsee Ads — connect to Google Ads via MCP, run a structured audit with deterministic scoring, and render results as generative UI in the existing chat interface.

**Architecture:** Extend Knowsee Verse with ad-specific tools, a TypeScript scoring engine, MCP server integration, and new generative UI components. Context management is foundational — applied from day one.

**Tech Stack:** Vercel AI SDK v6, Drizzle ORM, Google Ads MCP, Recharts, AI Elements `<Context>` component, existing shadcn/Radix primitives.

**MVP scope:** Google Ads only. 20 critical audit checks (not all 186). Four generative UI components. Context management baked in.

---

### Task 1: Context Management Foundation

Add `pruneMessages()` to the chat route and establish the `toModelOutput()` pattern for all future tools.

**Files:**
- Modify: `app/(chat)/api/chat/route.ts`
- Create: `lib/ai/context.ts`

**Step 1: Create context management utility**

Create `lib/ai/context.ts`:

```typescript
import { pruneMessages } from "ai";
import type { ModelMessage } from "ai";

export function compactMessages(messages: ModelMessage[]): ModelMessage[] {
  return pruneMessages({
    messages,
    reasoning: "before-last-message",
    toolCalls: "before-last-2-messages",
    emptyMessages: "remove",
  });
}
```

**Step 2: Integrate pruning into chat route**

In `app/(chat)/api/chat/route.ts`, after `convertToModelMessages(uiMessages)`, add pruning before passing to `streamText`:

```typescript
import { compactMessages } from "@/lib/ai/context";

// After line: const modelMessages = await convertToModelMessages(uiMessages);
const prunedMessages = compactMessages(modelMessages);

// Use prunedMessages instead of modelMessages in streamText call
```

**Step 3: Verify existing behaviour is preserved**

Run: `make dev` and test a normal conversation. Confirm no regressions.

**Step 4: Commit**

```
feat(ai): add context management with pruneMessages
```

---

### Task 2: Database Schema Extensions

Add tables for ad accounts, audit history, and check definitions.

**Files:**
- Modify: `lib/db/schema.ts`
- Create: `lib/db/migrations/` (generated)
- Modify: `lib/db/queries.ts`

**Step 1: Add schema definitions**

Append to `lib/db/schema.ts`:

```typescript
export const adAccount = pgTable("AdAccount", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  platform: varchar("platform", { length: 20 }).notNull(), // "google" | "meta"
  externalAccountId: varchar("externalAccountId", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const auditHistory = pgTable("AuditHistory", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  adAccountId: uuid("adAccountId")
    .notNull()
    .references(() => adAccount.id),
  overallScore: integer("overallScore").notNull(),
  grade: varchar("grade", { length: 2 }).notNull(), // A, B, C, D, F
  checkResults: json("checkResults").notNull(), // AuditCheckResult[]
  summary: text("summary"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});
```

**Step 2: Generate migration**

Run: `make db-generate`

**Step 3: Apply migration**

Run: `make db-migrate`

**Step 4: Add queries**

Append to `lib/db/queries.ts`:

```typescript
export async function getAdAccountsByUserId({ userId }: { userId: string }) {
  return db
    .select()
    .from(adAccount)
    .where(eq(adAccount.userId, userId))
    .orderBy(desc(adAccount.createdAt));
}

export async function saveAuditResult({
  adAccountId,
  overallScore,
  grade,
  checkResults,
  summary,
}: {
  adAccountId: string;
  overallScore: number;
  grade: string;
  checkResults: unknown;
  summary?: string;
}) {
  return db.insert(auditHistory).values({
    adAccountId,
    overallScore,
    grade,
    checkResults,
    summary,
  });
}

export async function getAuditHistory({ adAccountId }: { adAccountId: string }) {
  return db
    .select()
    .from(auditHistory)
    .where(eq(auditHistory.adAccountId, adAccountId))
    .orderBy(desc(auditHistory.createdAt))
    .limit(10);
}
```

**Step 5: Commit**

```
feat(db): add ad account and audit history schema
```

---

### Task 3: Scoring Engine

Build the deterministic TypeScript scoring engine. TDD — tests first.

**Files:**
- Create: `lib/ads/types.ts`
- Create: `lib/ads/checks/google.ts`
- Create: `lib/ads/scoring.ts`
- Create: `lib/ads/scoring.test.ts`

**Step 1: Define types**

Create `lib/ads/types.ts`:

```typescript
export type Platform = "google" | "meta";
export type Severity = "critical" | "high" | "medium" | "low";
export type CheckStatus = "pass" | "warning" | "fail" | "na";

export interface AuditCheck {
  id: string;
  name: string;
  platform: Platform;
  severity: Severity;
  category: string;
  description: string;
  passCriteria: string;
  failCriteria: string;
}

export interface CheckResult {
  checkId: string;
  status: CheckStatus;
  message: string;
  data?: Record<string, unknown>;
}

export interface AuditScore {
  overall: number;
  grade: string;
  categories: CategoryScore[];
  checkResults: CheckResult[];
  quickWins: CheckResult[];
}

export interface CategoryScore {
  name: string;
  score: number;
  weight: number;
  checkCount: number;
  passCount: number;
  failCount: number;
}

export const SEVERITY_WEIGHTS: Record<Severity, number> = {
  critical: 5.0,
  high: 3.0,
  medium: 1.5,
  low: 0.5,
};

export const GOOGLE_CATEGORY_WEIGHTS: Record<string, number> = {
  conversion_tracking: 0.25,
  wasted_spend: 0.20,
  structure: 0.15,
  keywords: 0.15,
  ads: 0.15,
  settings: 0.10,
};

export function scoreToGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}
```

**Step 2: Write scoring engine tests**

Create `lib/ads/scoring.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { calculateAuditScore } from "./scoring";
import type { AuditCheck, CheckResult } from "./types";

const mockChecks: AuditCheck[] = [
  { id: "G01", name: "Conversion tracking", platform: "google", severity: "critical", category: "conversion_tracking", description: "", passCriteria: "", failCriteria: "" },
  { id: "G02", name: "Search term review", platform: "google", severity: "high", category: "wasted_spend", description: "", passCriteria: "", failCriteria: "" },
  { id: "G03", name: "Ad extensions", platform: "google", severity: "medium", category: "ads", description: "", passCriteria: "", failCriteria: "" },
];

describe("calculateAuditScore", () => {
  it("returns 100 when all checks pass", () => {
    const results: CheckResult[] = [
      { checkId: "G01", status: "pass", message: "OK" },
      { checkId: "G02", status: "pass", message: "OK" },
      { checkId: "G03", status: "pass", message: "OK" },
    ];
    const score = calculateAuditScore(mockChecks, results, "google");
    expect(score.overall).toBe(100);
    expect(score.grade).toBe("A");
  });

  it("returns 0 when all checks fail", () => {
    const results: CheckResult[] = [
      { checkId: "G01", status: "fail", message: "Missing" },
      { checkId: "G02", status: "fail", message: "Missing" },
      { checkId: "G03", status: "fail", message: "Missing" },
    ];
    const score = calculateAuditScore(mockChecks, results, "google");
    expect(score.overall).toBe(0);
    expect(score.grade).toBe("F");
  });

  it("scores warnings at 0.5", () => {
    const results: CheckResult[] = [
      { checkId: "G01", status: "warning", message: "Partial" },
      { checkId: "G02", status: "pass", message: "OK" },
      { checkId: "G03", status: "pass", message: "OK" },
    ];
    const score = calculateAuditScore(mockChecks, results, "google");
    expect(score.overall).toBeGreaterThan(0);
    expect(score.overall).toBeLessThan(100);
  });

  it("excludes N/A checks from scoring", () => {
    const results: CheckResult[] = [
      { checkId: "G01", status: "na", message: "Not applicable" },
      { checkId: "G02", status: "pass", message: "OK" },
      { checkId: "G03", status: "pass", message: "OK" },
    ];
    const score = calculateAuditScore(mockChecks, results, "google");
    expect(score.overall).toBe(100);
  });

  it("identifies quick wins (critical/high severity fails)", () => {
    const results: CheckResult[] = [
      { checkId: "G01", status: "fail", message: "Missing" },
      { checkId: "G02", status: "fail", message: "Missing" },
      { checkId: "G03", status: "fail", message: "Missing" },
    ];
    const score = calculateAuditScore(mockChecks, results, "google");
    expect(score.quickWins.length).toBe(2); // G01 (critical) + G02 (high)
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `pnpm vitest run lib/ads/scoring.test.ts`
Expected: FAIL — module not found

**Step 4: Implement scoring engine**

Create `lib/ads/scoring.ts`:

```typescript
import type {
  AuditCheck,
  AuditScore,
  CategoryScore,
  CheckResult,
  Platform,
} from "./types";
import {
  GOOGLE_CATEGORY_WEIGHTS,
  SEVERITY_WEIGHTS,
  scoreToGrade,
} from "./types";

const STATUS_SCORES: Record<string, number> = {
  pass: 1.0,
  warning: 0.5,
  fail: 0.0,
};

function getCategoryWeights(platform: Platform): Record<string, number> {
  switch (platform) {
    case "google":
      return GOOGLE_CATEGORY_WEIGHTS;
    case "meta":
      return { pixel_capi: 0.3, creative: 0.3, structure: 0.2, audience: 0.2 };
    default:
      return {};
  }
}

export function calculateAuditScore(
  checks: AuditCheck[],
  results: CheckResult[],
  platform: Platform,
): AuditScore {
  const categoryWeights = getCategoryWeights(platform);
  const resultMap = new Map(results.map((r) => [r.checkId, r]));

  // Filter out N/A results
  const scorableChecks = checks.filter((check) => {
    const result = resultMap.get(check.id);
    return result && result.status !== "na";
  });

  // Calculate weighted score
  let weightedSum = 0;
  let weightedMax = 0;

  for (const check of scorableChecks) {
    const result = resultMap.get(check.id);
    if (!result) continue;

    const sevWeight = SEVERITY_WEIGHTS[check.severity];
    const catWeight = categoryWeights[check.category] ?? 0.1;
    const statusScore = STATUS_SCORES[result.status] ?? 0;

    weightedSum += statusScore * sevWeight * catWeight;
    weightedMax += sevWeight * catWeight;
  }

  const overall = weightedMax > 0 ? Math.round((weightedSum / weightedMax) * 100) : 0;

  // Category breakdown
  const categoryMap = new Map<string, { pass: number; total: number; fails: number }>();
  for (const check of scorableChecks) {
    const result = resultMap.get(check.id);
    if (!result) continue;
    const cat = categoryMap.get(check.category) ?? { pass: 0, total: 0, fails: 0 };
    cat.total++;
    if (result.status === "pass") cat.pass++;
    if (result.status === "fail") cat.fails++;
    categoryMap.set(check.category, cat);
  }

  const categories: CategoryScore[] = Array.from(categoryMap.entries()).map(
    ([name, data]) => ({
      name,
      score: data.total > 0 ? Math.round((data.pass / data.total) * 100) : 0,
      weight: categoryWeights[name] ?? 0.1,
      checkCount: data.total,
      passCount: data.pass,
      failCount: data.fails,
    }),
  );

  // Quick wins: critical/high severity failures
  const quickWins = results.filter((r) => {
    const check = checks.find((c) => c.id === r.checkId);
    return (
      r.status === "fail" &&
      check &&
      (check.severity === "critical" || check.severity === "high")
    );
  });

  return {
    overall,
    grade: scoreToGrade(overall),
    categories,
    checkResults: results,
    quickWins,
  };
}
```

**Step 5: Run tests to verify they pass**

Run: `pnpm vitest run lib/ads/scoring.test.ts`
Expected: ALL PASS

**Step 6: Commit**

```
feat(ads): add deterministic scoring engine with weighted formula
```

---

### Task 4: Google Ads Audit Check Definitions (MVP Set)

Extract 20 critical checks from claude-ads into structured TypeScript. Start with Google Ads only.

**Files:**
- Create: `lib/ads/checks/google.ts`

**Step 1: Create the 20 MVP Google Ads checks**

Create `lib/ads/checks/google.ts`:

```typescript
import type { AuditCheck } from "../types";

export const googleAdsChecks: AuditCheck[] = [
  // Conversion Tracking (5 checks)
  { id: "G01", name: "Conversion actions defined", platform: "google", severity: "critical", category: "conversion_tracking", description: "At least one primary conversion action must be configured", passCriteria: ">=1 primary conversion action configured", failCriteria: "No active conversion actions" },
  { id: "G02", name: "Enhanced conversions enabled", platform: "google", severity: "critical", category: "conversion_tracking", description: "Enhanced conversions should be active for primary conversions", passCriteria: "Enhanced conversions active", failCriteria: "Not enabled" },
  { id: "G03", name: "Conversion window appropriate", platform: "google", severity: "medium", category: "conversion_tracking", description: "Conversion window matches typical sales cycle", passCriteria: "Window aligns with sales cycle", failCriteria: "Default 30d on long-cycle product" },
  { id: "G04", name: "Attribution model set", platform: "google", severity: "high", category: "conversion_tracking", description: "Data-driven attribution should be enabled", passCriteria: "Data-driven attribution active", failCriteria: "Last-click attribution on high-volume account" },
  { id: "G05", name: "Tag firing correctly", platform: "google", severity: "critical", category: "conversion_tracking", description: "Conversion tags must fire on correct pages", passCriteria: "Tags firing and recording conversions", failCriteria: "Tags not firing or zero conversions in 7d" },

  // Wasted Spend (5 checks)
  { id: "G06", name: "Negative keyword coverage", platform: "google", severity: "high", category: "wasted_spend", description: "Shared negative keyword lists should be applied", passCriteria: "Negative lists applied to all search campaigns", failCriteria: "No negative keyword lists" },
  { id: "G07", name: "Search term relevance", platform: "google", severity: "high", category: "wasted_spend", description: "Search terms should be relevant to target keywords", passCriteria: "<10% irrelevant search terms", failCriteria: ">25% irrelevant search terms" },
  { id: "G08", name: "Display network placement review", platform: "google", severity: "medium", category: "wasted_spend", description: "Display placements should be reviewed and exclusions applied", passCriteria: "Placement exclusions active", failCriteria: "No placement exclusions on display campaigns" },
  { id: "G09", name: "Audience exclusions", platform: "google", severity: "medium", category: "wasted_spend", description: "Irrelevant audiences should be excluded", passCriteria: "Audience exclusions configured", failCriteria: "No audience exclusions" },
  { id: "G10", name: "Geographic targeting precision", platform: "google", severity: "high", category: "wasted_spend", description: "Location targeting should match service area", passCriteria: "Locations match business service area", failCriteria: "Targeting entire country for local business" },

  // Structure (4 checks)
  { id: "G11", name: "Campaign naming convention", platform: "google", severity: "low", category: "structure", description: "Campaigns should follow a consistent naming pattern", passCriteria: "Consistent naming across campaigns", failCriteria: "No discernible naming pattern" },
  { id: "G12", name: "Ad group theme coherence", platform: "google", severity: "high", category: "structure", description: "Ad groups should contain tightly themed keywords", passCriteria: "<20 keywords per ad group, single theme", failCriteria: ">50 keywords per ad group, mixed themes" },
  { id: "G13", name: "Campaign budget allocation", platform: "google", severity: "high", category: "structure", description: "Budget should align with campaign performance", passCriteria: "Top-performing campaigns receive adequate budget", failCriteria: "Budget evenly split regardless of performance" },
  { id: "G14", name: "Broad match + smart bidding pairing", platform: "google", severity: "critical", category: "structure", description: "Broad match keywords should only run with smart bidding", passCriteria: "No broad match on manual CPC", failCriteria: "Broad match + manual CPC active" },

  // Keywords (3 checks)
  { id: "G15", name: "Keyword match type distribution", platform: "google", severity: "medium", category: "keywords", description: "Healthy mix of match types across campaigns", passCriteria: "Mix of exact, phrase, and broad match", failCriteria: "100% broad match with no exact match" },
  { id: "G16", name: "Low quality score keywords", platform: "google", severity: "high", category: "keywords", description: "Keywords with QS <4 should be reviewed", passCriteria: "<10% of keywords with QS below 4", failCriteria: ">30% of keywords with QS below 4" },
  { id: "G17", name: "Duplicate keywords", platform: "google", severity: "medium", category: "keywords", description: "No duplicate keywords across ad groups", passCriteria: "No duplicates found", failCriteria: "Duplicate keywords competing in auction" },

  // Ads (3 checks)
  { id: "G18", name: "RSA ad strength", platform: "google", severity: "high", category: "ads", description: "Responsive search ads should have Good or Excellent strength", passCriteria: ">80% of RSAs rated Good or Excellent", failCriteria: ">50% of RSAs rated Poor or Average" },
  { id: "G19", name: "Ad extensions configured", platform: "google", severity: "high", category: "ads", description: "Sitelinks, callouts, and structured snippets should be set", passCriteria: "3+ extension types active", failCriteria: "No extensions configured" },
  { id: "G20", name: "Pinned headlines", platform: "google", severity: "medium", category: "ads", description: "Excessive pinning limits RSA optimisation", passCriteria: "<=2 pinned headlines per RSA", failCriteria: "All headlines pinned" },
];
```

**Step 2: Commit**

```
feat(ads): add 20 MVP Google Ads audit check definitions
```

---

### Task 5: Generative UI — Audit Score Card Component

Build the first generative UI component that renders audit results in chat.

**Files:**
- Create: `components/elements/audit-score-card.tsx`
- Modify: `lib/types.ts` (add to ChatTools and CustomUIDataTypes)

**Step 1: Create the AuditScoreCard component**

Create `components/elements/audit-score-card.tsx`:

```tsx
"use client";

import { cn } from "@/lib/utils";
import { memo } from "react";

interface CategoryScore {
  name: string;
  score: number;
  weight: number;
  checkCount: number;
  passCount: number;
  failCount: number;
}

interface AuditScoreCardProps {
  overall: number;
  grade: string;
  categories: CategoryScore[];
  quickWinCount: number;
}

const gradeColours: Record<string, string> = {
  A: "text-green-500 border-green-500/30 bg-green-500/10",
  B: "text-blue-500 border-blue-500/30 bg-blue-500/10",
  C: "text-yellow-500 border-yellow-500/30 bg-yellow-500/10",
  D: "text-orange-500 border-orange-500/30 bg-orange-500/10",
  F: "text-red-500 border-red-500/30 bg-red-500/10",
};

const categoryLabels: Record<string, string> = {
  conversion_tracking: "Conversion Tracking",
  wasted_spend: "Wasted Spend",
  structure: "Account Structure",
  keywords: "Keywords",
  ads: "Ads & Creative",
  settings: "Settings",
};

function ScoreBar({ score }: { score: number }) {
  const colour =
    score >= 75
      ? "bg-green-500"
      : score >= 50
        ? "bg-yellow-500"
        : "bg-red-500";
  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div
        className={cn("h-2 rounded-full transition-all", colour)}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

export const AuditScoreCard = memo(function AuditScoreCard({
  overall,
  grade,
  categories,
  quickWinCount,
}: AuditScoreCardProps) {
  return (
    <div className="not-prose w-full space-y-4 rounded-lg border p-4">
      {/* Header: Grade + Overall Score */}
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex size-16 items-center justify-center rounded-xl border-2 text-3xl font-bold",
            gradeColours[grade] ?? gradeColours.F,
          )}
        >
          {grade}
        </div>
        <div>
          <div className="text-2xl font-semibold">{overall}/100</div>
          <div className="text-sm text-muted-foreground">Overall Score</div>
        </div>
        {quickWinCount > 0 && (
          <div className="ml-auto rounded-md bg-orange-500/10 px-3 py-1 text-sm text-orange-500">
            {quickWinCount} quick win{quickWinCount !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Category Breakdown */}
      <div className="space-y-3">
        {categories.map((cat) => (
          <div key={cat.name} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>{categoryLabels[cat.name] ?? cat.name}</span>
              <span className="text-muted-foreground">
                {cat.passCount}/{cat.checkCount} passed
              </span>
            </div>
            <ScoreBar score={cat.score} />
          </div>
        ))}
      </div>
    </div>
  );
});
```

**Step 2: Commit**

```
feat(ui): add AuditScoreCard generative UI component
```

---

### Task 6: Generative UI — Metrics Grid and Quick Wins Table

Build the remaining core generative UI components.

**Files:**
- Create: `components/elements/metrics-grid.tsx`
- Create: `components/elements/quick-wins-table.tsx`

**Step 1: Create MetricsGrid component**

Create `components/elements/metrics-grid.tsx`:

```tsx
"use client";

import { cn } from "@/lib/utils";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { memo } from "react";

interface Metric {
  label: string;
  value: string;
  trend: "up" | "down" | "stable";
  changePercent: number;
}

interface MetricsGridProps {
  metrics: Metric[];
}

const trendConfig = {
  up: { icon: ArrowUp, colour: "text-green-500" },
  down: { icon: ArrowDown, colour: "text-red-500" },
  stable: { icon: ArrowRight, colour: "text-muted-foreground" },
};

export const MetricsGrid = memo(function MetricsGrid({
  metrics,
}: MetricsGridProps) {
  return (
    <div className="not-prose grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {metrics.map((metric) => {
        const { icon: Icon, colour } = trendConfig[metric.trend];
        return (
          <div
            key={metric.label}
            className="rounded-lg border p-3 space-y-1"
          >
            <div className="text-xs text-muted-foreground">{metric.label}</div>
            <div className="text-xl font-semibold">{metric.value}</div>
            <div className={cn("flex items-center gap-1 text-xs", colour)}>
              <Icon className="size-3" />
              <span>{Math.abs(metric.changePercent)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
});
```

**Step 2: Create QuickWinsTable component**

Create `components/elements/quick-wins-table.tsx`:

```tsx
"use client";

import { cn } from "@/lib/utils";
import { memo } from "react";

interface QuickWin {
  checkId: string;
  checkName: string;
  severity: "critical" | "high";
  message: string;
}

interface QuickWinsTableProps {
  wins: QuickWin[];
}

const severityBadge = {
  critical: "bg-red-500/10 text-red-500",
  high: "bg-orange-500/10 text-orange-500",
};

export const QuickWinsTable = memo(function QuickWinsTable({
  wins,
}: QuickWinsTableProps) {
  return (
    <div className="not-prose w-full space-y-2 rounded-lg border p-4">
      <div className="text-sm font-medium">
        Quick Wins ({wins.length})
      </div>
      <div className="space-y-2">
        {wins.map((win) => (
          <div
            key={win.checkId}
            className="flex items-start gap-3 rounded-md border p-3"
          >
            <span
              className={cn(
                "mt-0.5 shrink-0 rounded px-2 py-0.5 text-xs font-medium",
                severityBadge[win.severity],
              )}
            >
              {win.severity}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-medium">{win.checkName}</div>
              <div className="text-xs text-muted-foreground">
                {win.message}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
```

**Step 3: Commit**

```
feat(ui): add MetricsGrid and QuickWinsTable generative UI components
```

---

### Task 7: Ad Tools — showAuditScore and showQuickWins

Create the AI tools that return structured data for the generative UI components. These tools use `toModelOutput()` for context management.

**Files:**
- Create: `lib/ai/tools/show-audit-score.ts`
- Create: `lib/ai/tools/show-quick-wins.ts`
- Create: `lib/ai/tools/show-metrics.ts`
- Modify: `lib/types.ts` (extend ChatTools)

**Step 1: Create showAuditScore tool**

Create `lib/ai/tools/show-audit-score.ts`:

```typescript
import { tool } from "ai";
import { z } from "zod";
import { googleAdsChecks } from "@/lib/ads/checks/google";
import { calculateAuditScore } from "@/lib/ads/scoring";
import type { CheckResult } from "@/lib/ads/types";

export const showAuditScore = tool({
  description:
    "Display an audit score card showing the overall health grade of a Google Ads account. Call this after evaluating audit checks to present results visually.",
  parameters: z.object({
    checkResults: z.array(
      z.object({
        checkId: z.string(),
        status: z.enum(["pass", "warning", "fail", "na"]),
        message: z.string(),
      }),
    ),
  }),
  execute: async ({ checkResults }) => {
    const score = calculateAuditScore(
      googleAdsChecks,
      checkResults as CheckResult[],
      "google",
    );
    return {
      overall: score.overall,
      grade: score.grade,
      categories: score.categories,
      quickWinCount: score.quickWins.length,
      checkResults: score.checkResults,
    };
  },
  toModelOutput: ({ output }) => ({
    type: "text" as const,
    value: `Audit complete. Overall score: ${output.overall}/100 (Grade ${output.grade}). ${output.quickWinCount} quick wins identified. Categories: ${output.categories.map((c: { name: string; score: number }) => `${c.name}: ${c.score}%`).join(", ")}`,
  }),
});
```

**Step 2: Create showQuickWins tool**

Create `lib/ai/tools/show-quick-wins.ts`:

```typescript
import { tool } from "ai";
import { z } from "zod";

export const showQuickWins = tool({
  description:
    "Display a prioritised list of quick wins — high-impact, low-effort fixes for the ad account. Call after an audit to show actionable recommendations.",
  parameters: z.object({
    wins: z.array(
      z.object({
        checkId: z.string(),
        checkName: z.string(),
        severity: z.enum(["critical", "high"]),
        message: z.string(),
      }),
    ),
  }),
  execute: async ({ wins }) => ({ wins }),
  toModelOutput: ({ output }) => ({
    type: "text" as const,
    value: `${output.wins.length} quick wins: ${output.wins.map((w: { checkName: string }) => w.checkName).join(", ")}`,
  }),
});
```

**Step 3: Create showMetrics tool**

Create `lib/ai/tools/show-metrics.ts`:

```typescript
import { tool } from "ai";
import { z } from "zod";

export const showMetrics = tool({
  description:
    "Display a grid of key performance metrics with trend indicators. Use for showing campaign KPIs like CTR, CPC, conversions, and spend.",
  parameters: z.object({
    metrics: z.array(
      z.object({
        label: z.string(),
        value: z.string(),
        trend: z.enum(["up", "down", "stable"]),
        changePercent: z.number(),
      }),
    ),
  }),
  execute: async ({ metrics }) => ({ metrics }),
  toModelOutput: ({ output }) => ({
    type: "text" as const,
    value: `Metrics: ${output.metrics.map((m: { label: string; value: string }) => `${m.label}: ${m.value}`).join(", ")}`,
  }),
});
```

**Step 4: Extend ChatTools type**

In `lib/types.ts`, add the new tools to the `ChatTools` type. Also add any needed imports.

**Step 5: Commit**

```
feat(ai): add showAuditScore, showQuickWins, and showMetrics ad tools
```

---

### Task 8: Wire Generative UI into Message Renderer

Connect the new tools to their corresponding React components in the message renderer.

**Files:**
- Modify: `components/message.tsx`

**Step 1: Add imports and tool-part rendering**

In `components/message.tsx`, add imports for the new components and add rendering cases in the parts iteration:

```tsx
import { AuditScoreCard } from "@/components/elements/audit-score-card";
import { MetricsGrid } from "@/components/elements/metrics-grid";
import { QuickWinsTable } from "@/components/elements/quick-wins-table";

// In the parts map, add:

if (part.type === "tool-showAuditScore") {
  if (part.state === "output-available") {
    return (
      <AuditScoreCard
        key={key}
        overall={part.output.overall}
        grade={part.output.grade}
        categories={part.output.categories}
        quickWinCount={part.output.quickWinCount}
      />
    );
  }
  return <ToolSkeleton key={key} label="Running audit..." />;
}

if (part.type === "tool-showQuickWins") {
  if (part.state === "output-available") {
    return <QuickWinsTable key={key} wins={part.output.wins} />;
  }
  return <ToolSkeleton key={key} label="Finding quick wins..." />;
}

if (part.type === "tool-showMetrics") {
  if (part.state === "output-available") {
    return <MetricsGrid key={key} metrics={part.output.metrics} />;
  }
  return <ToolSkeleton key={key} label="Loading metrics..." />;
}
```

**Step 2: Create a minimal ToolSkeleton if one doesn't exist**

Check existing codebase for a skeleton component. If not present, create a simple one using the existing `Skeleton` from `components/ui/skeleton.tsx`.

**Step 3: Commit**

```
feat(ui): wire audit score, metrics, and quick wins into message renderer
```

---

### Task 9: Register Tools in Chat Route

Add the new ad tools to the `streamText` call in the chat API route.

**Files:**
- Modify: `app/(chat)/api/chat/route.ts`

**Step 1: Import and register tools**

Add the new tool imports and include them in the `tools` object passed to `streamText`:

```typescript
import { showAuditScore } from "@/lib/ai/tools/show-audit-score";
import { showQuickWins } from "@/lib/ai/tools/show-quick-wins";
import { showMetrics } from "@/lib/ai/tools/show-metrics";

// In streamText call, add to tools:
tools: {
  createDocument,
  updateDocument,
  requestSuggestions,
  showAuditScore,
  showQuickWins,
  showMetrics,
},
```

**Step 2: Add ad-specific system prompt section**

In `lib/ai/prompts.ts` or `lib/ai/instructions/`, add an ads instruction block that tells the model about the audit checks, when to use the ad tools, and how to interpret results. Include the 20 check definitions so the model knows what to evaluate.

**Step 3: Verify end-to-end**

Run: `make dev`
Test: Ask "Audit my Google Ads account" in chat. The model should attempt to use the audit tools. Without MCP connected, it will use the check definitions to generate mock evaluations and call `showAuditScore`.

**Step 4: Commit**

```
feat(ai): register ad tools in chat route with ads system prompt
```

---

### Task 10: MCP Server Integration — Google Ads

Install and configure the Google Ads MCP server to provide real ad platform data.

**Files:**
- Modify: `package.json`
- Create or modify MCP configuration (check project's MCP setup pattern)
- Modify: `app/(chat)/api/chat/route.ts` (if MCP tools need explicit registration)

**Step 1: Research MCP server setup**

Check how `google-marketing-solutions/google_ads_mcp` is installed and configured. It may require:
- Python environment (the official server is Python-based)
- Google Ads API developer token
- OAuth credentials for the ad account

**Step 2: Install the MCP server**

Follow the official README. Likely:
```bash
pip install google-ads-mcp
```
Or clone and configure as a subprocess.

**Step 3: Configure MCP connection**

Add MCP server configuration to the project's MCP config (check for `.mcp.json`, `mcp.config.ts`, or similar pattern in the codebase).

**Step 4: Test connectivity**

Verify the MCP server tools are accessible. Test a basic query like listing campaigns.

**Step 5: Commit**

```
feat(ads): integrate Google Ads MCP server for ad platform data
```

---

### Task 11: Context Visibility — `<Context>` Component

Integrate the AI Elements `<Context>` component to show token usage in the chat header.

**Files:**
- Copy or import: Context component from `ai-elements` package
- Modify: `components/chat-header.tsx`
- Modify: `app/(chat)/api/chat/route.ts` (expose usage data)

**Step 1: Copy or install the Context component**

Either copy `context.tsx` from `/Users/saahil/Documents/GitHub/ai-elements/packages/elements/src/context.tsx` into `components/ai-elements/context.tsx`, or install as a package dependency if published. Ensure `tokenlens` is added to dependencies.

**Step 2: Expose usage data from the stream**

In the chat route, expose `LanguageModelUsage` data via the data stream so the client can read token counts.

**Step 3: Add to chat header**

In `components/chat-header.tsx`, render the `<Context>` component with the usage data.

**Step 4: Commit**

```
feat(ui): add context window usage indicator to chat header
```

---

### Task 12: ChainOfThought — Wire into Audit Progress

Connect the existing ChainOfThought component to audit tool rendering for step-by-step progress.

**Files:**
- Modify: `components/message.tsx` (audit tool rendering)
- Modify: `lib/ai/tools/show-audit-score.ts` (add progress streaming)

**Step 1: Update audit tool to stream progress**

Modify `showAuditScore` to use a generator pattern that yields progress steps before the final result. Use `dataStream.write()` to send progress updates.

**Step 2: Render ChainOfThought in message renderer**

In the `tool-showAuditScore` rendering case, show `<ChainOfThought>` with steps during `input-available` state, transitioning to `<AuditScoreCard>` on `output-available`.

**Step 3: Commit**

```
feat(ui): wire ChainOfThought into audit progress visualisation
```

---

### Task 13: Ad-Specific System Prompt

Create a dedicated system prompt for the Knowsee Ads persona with knowledge of audit checks, ad platform concepts, and when to use which tools.

**Files:**
- Create: `lib/ai/instructions/ads.md`
- Modify: `lib/ai/instructions/index.ts`
- Modify: `lib/ai/prompts.ts`

**Step 1: Write the ads instruction**

Create `lib/ai/instructions/ads.md` covering:
- Knowsee Ads persona and UK-first positioning
- When to use each ad tool (audit, metrics, quick wins)
- The 20 audit check IDs and what they evaluate
- How to interpret scores and grades
- When to recommend using different tools

**Step 2: Integrate into prompt composition**

In `lib/ai/prompts.ts`, add the ads instruction to the system prompt when the ads agent mode is active.

**Step 3: Commit**

```
feat(ai): add Knowsee Ads system prompt with audit knowledge
```

---

### Milestone Checkpoint

After Task 13, you have a working MVP:

- [x] Context management (pruneMessages + toModelOutput on all ad tools)
- [x] Database schema for ad accounts and audit history
- [x] Deterministic scoring engine (20 Google Ads checks, weighted formula)
- [x] Three generative UI components (AuditScoreCard, MetricsGrid, QuickWinsTable)
- [x] Three ad tools registered in chat route
- [x] Context visibility via `<Context>` component
- [x] ChainOfThought audit progress
- [x] Google Ads MCP server integration
- [x] Ad-specific system prompt

**Next phase (post-MVP):**
- Task 14: Meta Ads MCP integration + meta check definitions
- Task 15: Report artifact (full audit report as side-panel document)
- Task 16: Haiku/Sonnet/Opus model router middleware
- Task 17: Usage tracking and metering
- Task 18: Multi-account management UI
- Task 19: Compaction middleware (prepareStep with Haiku summarisation)

---

## Appendix: Competitive Intelligence

### Ryze AI Vulnerability Analysis

- **Founded by:** Ira Bodnar (San Francisco)
- **Peak metrics:** 230+ customers, $50M+ managed ad spend, 70% conversion rate
- **Current state:** Conversion rate collapsed to 20% after Claude/Manus shipped ad connectors
- **Pivot:** Repositioning toward complex multi-account agency workflows
- **No public GitHub repos** — fully proprietary
- **Pricing:** Opaque, likely ad-spend percentage model
- **Geography:** US-focused, no UK presence
