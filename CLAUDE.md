# Project Details — Knowsee Verse
A conversational AI assistant built as a full-stack Next.js application with Vercel AI SDK.

## Vision
A personal AI assistant (Knowsee) with artifact creation, web browsing, and multi-model support — deployed on Vercel with persistent chat history and resumable streams.

## Stack
- **AI**: Vercel AI SDK v6 (`ai`, `@ai-sdk/react`, `@ai-sdk/anthropic`, `@ai-sdk/gateway`)
- **Framework**: Next.js 16 (App Router, Turbopack, `proxy.ts` middleware)
- **UI**: Radix primitives + Tailwind v4 + shadcn pattern
- **Database**: PostgreSQL (Drizzle ORM, migrations in `lib/db/migrations/`)
- **Auth**: NextAuth v5 beta (guest + regular user types)
- **Infra**: Vercel (blob storage, analytics, OpenTelemetry)
- **Testing**: Playwright (e2e)
- **Linting**: Biome via ultracite (`pnpm lint` / `pnpm format`)
- **Package manager**: pnpm

## Critical
- Always provide honest critical assessment under Critical Assessment section after completion of a task
- Reuse existing ecosystems or tools when feasible

## Guiding Principles (MUST FOLLOW)
- MCPs: Use sub-agents to query MCPs for fetching information as they fill up context quickly
- KISS, DRY, YAGNI — redundancy is the enemy
- Reliability and simplicity are the mottos
- Root cause thinking — find the simplest systems solution
- Small increments — one feature, implement, test, verify, build
- Project tooling — use `make` (Makefile) targets, not raw commands
- No hacky or fragile approaches; question if a better method is available
- Superpowers usage: `/superpowers:brainstorm` is the primary Superpowers skill. Use it before material feature work, UX/product decisions, prompt or AI behaviour changes, architecture changes, or unclear scope. Do not treat other Superpowers as mandatory unless explicitly requested or clearly useful.
- Makefile must be composable and DRY
- Gitignore philosophy: ignore by intent (credentials, secrets, build outputs), not by extension

## Debugging Philosophy

The principle sticks, the stack drifts. These are about how to debug anything, not about this codebase.

- **Evidence outranks assertion, regardless of source.** A hypothesis grounded in observation does not get demoted by a verbal claim — not the user's, not memory's, not a confident document's. Claims describe a *model* of state; the live system *is* state. When a claim contradicts a strong prior, verify cheaply rather than pivot. Surrendering a correct prior to a wrong assertion costs an entire detour; doubting an assertion costs a one-line query. Ask which command produced the claim, or run it yourself.

- **Look before you theorise.** When something is opaque — a redacted message, an unknown code, a "this used to work" — fetching the next layer of detail is almost always cheaper than constructing a story that explains the visible symptom. Stories grow to fit symptoms and feel like progress; raw evidence does not flatter the reasoner. Pull the log, dump the state, run the diff first; build the narrative second.

- **Separate what was observed from what is being claimed about it.** The user's symptoms are data and should be taken as given. The user's causal explanation is a hypothesis on equal footing with any other. Do not let the two collapse into one input in reasoning. Treat "this is what I see" as a fact and "this is why I think it's happening" as a candidate.

- **Boring causes outnumber dramatic ones.** A failure pattern that *feels* like cascading infection, state poisoning, or coordinated misbehaviour usually decomposes into many identical small failures, or one root presenting at many surfaces. The aesthetic of a symptom is not evidence about its cause. Reach for the boring explanation first; promote dramatic ones only when the boring ones are ruled out.

- **Described state drifts from applied state.** Anywhere a system holds both a description of how it *should* be (a config file, a doc, a recollection of a past action) and a representation of how it *is* (the runtime, the API, the live process), the two diverge over time. When a question turns on which is true, query the live system, not the description. Written-down state is data, not ground truth.

- **A fix without a confirmed root cause is a guess wearing a uniform.** It is allowed to ship a guess when the cost of being wrong is small and the cost of investigating is high — but call it that. Do not let pressure to act collapse the difference between "I have evidence X causes Y" and "X is plausible and would explain Y if true". One closes a loop; the other widens it.

## AI SDK Development

### Core Primitives (server-side, Route Handlers)
- **`streamText`** for streaming chat responses; **`generateText`** for non-streaming (title generation, background tasks)
- **`generateObject` / `streamObject`** with Zod schemas for structured output
- **`tool()`** to define tools — `description` is the LLM's schema, be precise and comprehensive
- **`createUIMessageStream`** + `createUIMessageStreamResponse` for the streaming pipeline
- **`stepCountIs(n)`** (not `maxSteps`) to cap agent tool-call loops
- **`convertToModelMessages`** to translate UI messages to model format
- Export `maxDuration` in route files to extend Vercel's streaming timeout

### Provider System
- Providers are swappable packages implementing `LanguageModelV3`
- Current provider: `@ai-sdk/anthropic` for tools (web search, web fetch, memory), `@ai-sdk/gateway` for model routing
- Model resolution: `lib/ai/providers.ts` — validates model IDs against the registry, falls back to default
- Reasoning: Anthropic adaptive thinking via `providerOptions.anthropic.thinking` (not middleware)
- Memory: `anthropic.tools.memory_20250818({ execute })` — provider-defined tool with custom DB-backed execute handler
- Test environment uses `customProvider` with mock models — never call real providers in tests

### Middleware
- `wrapLanguageModel({ model, middleware })` for cross-cutting concerns (logging, reasoning extraction, guardrails)
- Middleware hooks: `wrapGenerate`, `wrapStream`, `transformParams`
- Keep middleware composable — one concern per middleware

### Tools Pattern
- Tools live in `lib/ai/tools/` — one file per tool
- Each tool uses `tool({ description, parameters: z.object({...}), execute })` from `ai`
- Tools needing session/stream context use a factory pattern: `createDocument({ session, dataStream })`
- `experimental_activeTools` controls which tools are available per request (e.g. disabled for reasoning models)

### UI Hooks (client-side)
- **`useChat`** is the primary hook — uses `DefaultChatTransport({ api: '/api/chat' })` in v4+
- Messages use a **parts array** model (not flat `content`) — each part has a `type` discriminator
- Type the hook generically: `useChat<ChatMessage>()` with typed tools via `InferUITool`
- Custom data types flow through `CustomUIDataTypes` in `lib/types.ts`

### Data Flow
```
Client (useChat) → POST /api/chat/route.ts → streamText() → tools execute
                                            → createUIMessageStream → SSE back to client
                                            → onFinish: persist to DB
```

### Key Conventions
- System prompts are composed in `lib/ai/prompts.ts` — modular functions, not monolithic strings
- Agent modes (`AgentMode` type) swap prompt sections at runtime
- Tool results and messages persist via Drizzle queries in `onFinish` callbacks
- Resumable streams via Redis for production reliability

## Identity
- The assistant is **Knowsee** — all user-facing text must use "Knowsee", never "Claude", "AI", or any other model name
- Identity definition: `lib/ai/instructions/identity.md`
- Created by Saahil Mehta (knowsee.co.uk)

## Frontend Development
- Components in `components/` — shadcn pattern with Radix primitives
- `proxy.ts` is the Next.js 16 middleware (replaces `middleware.ts`)
- Data streaming: `data-stream-handler.tsx` and `data-stream-provider.tsx` manage real-time UI updates
- Artifacts system: `artifact.tsx` renders documents/code/sheets alongside chat
- If in doubt about component patterns, check existing components first

## Database
- Schema: `lib/db/schema.ts` (Drizzle ORM)
- Migrations: `lib/db/migrations/` (generated via `pnpm db:generate`)
- Queries: `lib/db/queries.ts` — all DB access through this module
- Local dev: Docker Compose PostgreSQL (`make db-up`)

## Commit Policy
Use conventional commits:
`<type>(<scope>): <subject>`

Types: feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert
- Subject in lowercase, imperative mood
- Do not co-author or attribute

### Commit Granularity
- One logical change per commit (smallest atomic commits)
- Separate commits for: features, fixes, refactors, chores
- When multiple changes exist, ask user how to group them
- Never bundle unrelated changes in a single commit
- Commits must be bisectable and reviewable

## Output Policy
- UK English spelling
- No emojis
- No em dashes (—); use commas, colons, parentheses, or rephrase. En dashes (–) and hyphens (-) are fine. Replace any pre-existing em dashes when editing nearby content.
- Identity-bearing labels in test or verification traffic (User-Agent, X-Source, job labels, automation markers) use `smehta/<kebab-case-purpose>`. Never `claude-*`, `anthropic-*`, `ai-*`, or any AI-branded variant. Identity labels persist in audit trails; attribution belongs to the human operating the terminal.
- No unnecessary documentation
- Always provide honest critical assessment under CRITICAL_ASSESSMENT
