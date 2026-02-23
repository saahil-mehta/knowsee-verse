# Anthropic Server-Side Tools Integration

**Date:** 2026-02-23
**Status:** Approved

## Overview

Integrate Anthropic's server-side tool suite (web search v2, web fetch v2, code execution) into the chat route as always-on capabilities. Claude decides autonomously when to search. All billing flows through the Vercel AI Gateway — no separate Anthropic API key required.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  streamText() in route.ts                            │
│                                                      │
│  Server-side (Anthropic executes, PTC-ready):        │
│  ├── web_search  (web_search_20260209)               │
│  ├── web_fetch   (web_fetch_20260209)                │
│  └── code_execution (code_execution_20250825)        │
│                                                      │
│  Client-side (app executes, unchanged):              │
│  ├── createDocument                                  │
│  ├── updateDocument                                  │
│  └── requestSuggestions                              │
│                                                      │
│  Model: gateway("anthropic/claude-*")                │
│  Tool defs: @ai-sdk/anthropic (new dependency)       │
└─────────────────────────────────────────────────────┘
```

## Tool Configuration

### Web Search (`web_search_20260209`)
- v2 with dynamic filtering (code execution filters results before they enter context)
- `maxUses: 5` — caps cost at $0.05/request
- `userLocation` populated from Vercel edge geolocation (already captured in route.ts)
- Falls back to country: 'US' in local dev where geolocation returns undefined

### Web Fetch (`web_fetch_20260209`)
- v2 with dynamic filtering
- `maxUses: 3` — prevents runaway page reads
- `maxContentTokens: 25_000` — safety valve against large pages
- Free — only standard token costs

### Code Execution (`code_execution_20250825`)
- Free when paired with v2 web search/fetch tools
- Enables dynamic filtering of search results and fetched content
- Sandboxed Python 3.11 on Anthropic's servers

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Add `@ai-sdk/anthropic` |
| `lib/ai/tools/server-tools.ts` | New — factory function for server-side tool definitions |
| `app/(chat)/api/chat/route.ts` | Wire server tools into streamText, increase stepCount to 8 |
| `lib/ai/instructions/identity.md` | Add web access guidance section |

## Route Integration

Server tools are created per-request (to inject geolocation) and spread into the tools object alongside existing client-side tools. The `experimental_activeTools` array is updated to include all six tools. Reasoning models continue to receive no tools.

Step count increased from 5 to 8 to accommodate search → fetch → process → respond workflows with room for artifact creation.

## Prompt Update

Identity prompt gains a "Web access" section guiding Claude on when to search vs when to rely on training data. Emphasises not searching for general knowledge, reasoning, or artifact-focused tasks.

## Cost Profile

| Tool | Per-use cost | Token cost | Cap per request |
|------|-------------|------------|-----------------|
| Web search | $0.01/search | Input tokens for results | 5 searches ($0.05) |
| Web fetch | Free | Input tokens for content | 3 fetches, 25k tokens each |
| Code execution | Free (with v2 tools) | Standard token rates | — |

## Out of Scope

- No UI changes (no search toggle, no indicator)
- No changes to artifact tools (createDocument, updateDocument, requestSuggestions)
- No PTC for client-side tools (future work)
- No changes to test mock provider
- No deep research agent mode (future work)
