# Project Details — Knowsee Verse
A conversational AI assistant built as a full-stack Next.js application with Vercel AI SDK.

## Vision
A personal AI assistant (Knowsee) with artifact creation, web browsing, and multi-model support — deployed on Vercel with persistent chat history and resumable streams.

## Stack
- **AI**: Vercel AI SDK v6 (`ai`, `@ai-sdk/react`, `@ai-sdk/groq`)
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
- Call the /superpowers:brainstorm skill whenever necessary
- Makefile must be composable and DRY
- Gitignore philosophy: ignore by intent (credentials, secrets, build outputs), not by extension

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
- Current provider: `@ai-sdk/groq` via `createGroq()`
- Model resolution: `lib/ai/providers.ts` — validates model IDs against the registry, falls back to default
- Reasoning models are wrapped with `extractReasoningMiddleware({ tagName: "thinking" })`
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
- No unnecessary documentation
- Always provide honest critical assessment under CRITICAL_ASSESSMENT

