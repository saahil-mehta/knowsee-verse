# Claude Memory Tool for Brand Projects

## Overview

Enable cross-conversation learning for brand projects using Claude's provider-defined memory tool (`memory_20250818`). Claude automatically reads and writes memory files scoped per project, persisted in Supabase Postgres via Drizzle. Users view/delete memories from a dialog on the project home page.

## Architecture

### Data flow

```
Brand chat request
├─ Route handler detects brandProfile exists
├─ Adds memory tool to tools list (provider-defined)
├─ Claude calls memory tool (view, create, str_replace, etc.)
├─ Execute handler maps commands → Drizzle queries against `memory` table
├─ Scoped by projectId (each brand has isolated memories)
└─ Step budget: 20
```

### Key decisions

- **Always-on** for brand projects (no toggle)
- **Read-only + delete UI** — Claude is the author; users can view and delete but not edit
- **Per-project isolation** — each brand has its own `/memories` namespace
- **Provider-defined tool** — Claude is trained on this schema, lowest implementation effort

## Database

### New `memory` table

```
memory
├─ id          UUID (PK, default random)
├─ projectId   UUID (FK → project.id, NOT NULL, ON DELETE CASCADE)
├─ path        VARCHAR (NOT NULL) — e.g. "/memories/brand_voice.xml"
├─ content     TEXT (NOT NULL, default "")
├─ createdAt   TIMESTAMP (default now)
├─ updatedAt   TIMESTAMP (default now)
└─ UNIQUE(projectId, path)
```

### Command → query mapping

| Command | Query |
|---------|-------|
| `view /memories` | `SELECT path FROM memory WHERE projectId = ?` |
| `view /memories/file.xml` | `SELECT content FROM memory WHERE projectId = ? AND path = ?` |
| `create` | `INSERT INTO memory` |
| `str_replace` | Fetch content, string replace in JS, `UPDATE` |
| `insert` | Fetch content, splice at line number, `UPDATE` |
| `delete` | `DELETE FROM memory WHERE projectId = ? AND path = ?` |
| `rename` | `UPDATE memory SET path = ? WHERE projectId = ? AND path = ?` |

## UI

### Project home page

"Memory" button in brand profile card header alongside existing "Edit" button. Uses `database-2-line` Remix Icon.

### Memory dialog

```
┌─ Brand Memory ──────────────────────────────┐
│                                              │
│  Claude stores learnings about your brand    │
│  across conversations.                       │
│                                              │
│  ┌─ /memories/brand_voice.xml ─────── [x] ┐ │
│  │ - Tone: professional but approachable   │ │
│  │ - Avoids jargon, prefers plain English  │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  ┌─ /memories/audit_findings.xml ──── [x] ┐ │
│  │ - Commerce readiness: 6/10             │ │
│  │ - Missing structured data on PDPs      │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│                          [Clear All] [Close] │
└──────────────────────────────────────────────┘
```

- Read-only content display, delete per file with confirmation
- "Clear All" button with confirmation to reset all memories
- Empty state: "No memories yet. Claude will store learnings as you chat."

## Implementation Steps

### Step 1 — Database (schema + migration)

- Add `memory` table to `lib/db/schema.ts`
- Add CRUD queries to `lib/db/queries.ts`:
  - `getMemoriesByProjectId({ projectId })`
  - `getMemoryByPath({ projectId, path })`
  - `createMemory({ projectId, path, content })`
  - `updateMemoryContent({ projectId, path, content })`
  - `deleteMemoryByPath({ projectId, path })`
  - `deleteMemoryById({ id })`
  - `deleteAllMemoriesByProjectId({ projectId })`
  - `renameMemory({ projectId, oldPath, newPath })`
- Generate migration via `pnpm db:generate`

### Step 2 — Memory tool execute handler

- Create `lib/ai/tools/memory.ts`
- Factory: `createMemoryTool({ projectId })`
- Import `anthropic` from `@ai-sdk/anthropic`, use `anthropic.tools.memory_20250818({ execute })`
- Implement all 6 commands with path validation (must start with `/memories`)
- Return strings matching Claude's expected format (documented in Anthropic docs)

### Step 3 — Wire into chat route

- In `app/(chat)/api/chat/route.ts`:
  - When `brandProfile` exists, call `createMemoryTool({ projectId })`
  - Add to tools object and `experimental_activeTools`
  - Change step budget: `stepCountIs(20)`

### Step 4 — Memory API route

- `GET /api/project/[id]/memory` — list all memory files
- `DELETE /api/project/[id]/memory` — clear all memories
- `DELETE /api/project/[id]/memory/[memoryId]` — delete single file
- Ownership validation (same pattern as existing project routes)

### Step 5 — UI components

- `MemoryDialog` component with file list, delete buttons, clear-all
- "Memory" button on `ProjectHome` brand profile card header
- Confirmation dialogs for destructive actions
- SWR for `/api/project/[id]/memory` with optimistic updates on delete

### Step 6 — Verification

- Test: brand chat → Claude writes memory → new chat → Claude reads it back
- Test: delete memory file via UI → Claude no longer references it
- Test: path traversal attempts are rejected
- Test: non-brand chats do not have memory tool available

## Security

- All paths validated to start with `/memories`
- Reject `../`, `..\\`, URL-encoded traversal patterns
- Resolve paths canonically before DB operations
- Project ownership checked on all API routes
- Memory scoped by projectId — no cross-project access
