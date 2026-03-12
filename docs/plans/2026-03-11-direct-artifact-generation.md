# Direct Artifact Generation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate the inner `streamText` call for text artifacts so the model generates document content directly, with progressive streaming to the artifact panel via tool call streaming.

**Architecture:** Two phases forming a single feature. Phase 1 adds `content` parameter to tools so the model generates text directly (one generation, full context). Phase 2 adds a client-side `ToolStreamHandler` that watches AI SDK v6's tool call streaming (`input-streaming` state) to progressively render content in the artifact panel as the model generates it — no waiting for `execute`.

**Tech Stack:** AI SDK v6 (`ai`, `@ai-sdk/react`), Zod, Next.js App Router

**Scope:** Text artifacts only. Code and sheet artifacts retain their current inner generation pattern.

---

## Phase 1: Direct content generation (server-side)

### Task 1: Add `content` parameter to `createDocument` tool

**Files:**
- Modify: `lib/artifacts/server.ts` (type definitions)
- Modify: `lib/ai/tools/create-document.ts`

**Step 1: Update `CreateDocumentCallbackProps` type**

In `lib/artifacts/server.ts`, add optional `content` to the callback props:

```typescript
export type CreateDocumentCallbackProps = {
  id: string;
  title: string;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  session: Session;
  modelId: string;
  content?: string;
};
```

**Step 2: Pass `content` through `createDocumentHandler` wrapper**

In `lib/artifacts/server.ts`, update `onCreateDocument` to forward `content`:

```typescript
onCreateDocument: async (args: CreateDocumentCallbackProps) => {
  const draftContent = await config.onCreateDocument({
    id: args.id,
    title: args.title,
    dataStream: args.dataStream,
    session: args.session,
    modelId: args.modelId,
    content: args.content,
  });
  // ... save logic unchanged
},
```

**Step 3: Add `content` to tool input schema**

In `lib/ai/tools/create-document.ts`:

```typescript
inputSchema: z.object({
  title: z.string(),
  kind: z.enum(artifactKinds),
  content: z
    .string()
    .optional()
    .describe(
      "The full document content in markdown. REQUIRED for text documents — write the complete document here. Not used for code or sheet artifacts."
    ),
}),
```

**Step 4: Pass `content` to document handler in `execute`**

```typescript
await documentHandler.onCreateDocument({
  id,
  title,
  dataStream,
  session,
  modelId,
  content,
});
```

**Step 5: Strengthen tool result message**

```typescript
return {
  id,
  title,
  kind,
  content: `Document created and visible to the user (id: ${id}). Do NOT update this document in the same response. Wait for user feedback before making changes.`,
};
```

**Step 6: Verify build**

Run: `pnpm build`

**Step 7: Commit**

```
feat(ai): add content parameter to createDocument tool
```

---

### Task 2: Text handler uses model-provided content

**Files:**
- Modify: `artifacts/text/server.ts`

**Step 1: Update `onCreateDocument` to use provided content**

```typescript
onCreateDocument: async ({ title, dataStream, modelId, content }) => {
  if (content) {
    dataStream.write({
      type: "data-textDelta",
      data: content,
      transient: true,
    });
    return content;
  }

  // Fallback: inner streamText when no content provided
  let draftContent = "";

  const { fullStream } = streamText({
    model: getLanguageModel(modelId),
    system:
      "Write about the given topic. Markdown is supported. Use headings wherever appropriate.",
    experimental_transform: smoothStream({ chunking: "line" }),
    prompt: title,
  });

  for await (const delta of fullStream) {
    if (delta.type === "text-delta") {
      draftContent += delta.text;
      dataStream.write({
        type: "data-textDelta",
        data: delta.text,
        transient: true,
      });
    }
  }

  return draftContent;
},
```

**Step 2: Verify build**

Run: `pnpm build`

**Step 3: Commit**

```
feat(ai): text handler uses model-provided content directly
```

---

### Task 3: Add `content` parameter to `updateDocument` tool

**Files:**
- Modify: `lib/artifacts/server.ts` (type definitions)
- Modify: `lib/ai/tools/update-document.ts`

**Step 1: Update `UpdateDocumentCallbackProps` type**

In `lib/artifacts/server.ts`:

```typescript
export type UpdateDocumentCallbackProps = {
  document: Document;
  description: string;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  session: Session;
  modelId: string;
  content?: string;
};
```

**Step 2: Pass `content` through `createDocumentHandler` wrapper**

In `lib/artifacts/server.ts`, update `onUpdateDocument`:

```typescript
onUpdateDocument: async (args: UpdateDocumentCallbackProps) => {
  const draftContent = await config.onUpdateDocument({
    document: args.document,
    description: args.description,
    dataStream: args.dataStream,
    session: args.session,
    modelId: args.modelId,
    content: args.content,
  });
  // ... save logic unchanged
},
```

**Step 3: Add `content` to update tool input schema**

In `lib/ai/tools/update-document.ts`:

```typescript
inputSchema: z.object({
  id: z.string().describe("The ID of the document to update"),
  description: z
    .string()
    .describe("The description of changes that need to be made"),
  content: z
    .string()
    .optional()
    .describe(
      "The full updated document content in markdown. REQUIRED for text documents — provide the complete rewritten document. Not used for code or sheet artifacts."
    ),
}),
```

**Step 4: Pass `content` to document handler in `execute`**

```typescript
await documentHandler.onUpdateDocument({
  document,
  description,
  dataStream,
  session,
  modelId,
  content,
});
```

**Step 5: Verify build**

Run: `pnpm build`

**Step 6: Commit**

```
feat(ai): add content parameter to updateDocument tool
```

---

### Task 4: Text update handler uses model-provided content

**Files:**
- Modify: `artifacts/text/server.ts`

**Step 1: Update `onUpdateDocument` to use provided content**

```typescript
onUpdateDocument: async ({ document, description, dataStream, modelId, content }) => {
  if (content) {
    dataStream.write({
      type: "data-textDelta",
      data: content,
      transient: true,
    });
    return content;
  }

  // Fallback: inner streamText with update prompt
  let draftContent = "";

  const { fullStream } = streamText({
    model: getLanguageModel(modelId),
    system: updateDocumentPrompt(document.content, "text"),
    experimental_transform: smoothStream({ chunking: "line" }),
    prompt: description,
    providerOptions: {
      openai: {
        prediction: {
          type: "content",
          content: document.content,
        },
      },
    },
  });

  for await (const delta of fullStream) {
    if (delta.type === "text-delta") {
      draftContent += delta.text;
      dataStream.write({
        type: "data-textDelta",
        data: delta.text,
        transient: true,
      });
    }
  }

  return draftContent;
},
```

**Step 2: Verify build, commit**

```
feat(ai): text update handler uses model-provided content directly
```

---

### Task 5: Update system prompts

**Files:**
- Modify: `lib/ai/instructions/artifacts.md`
- Modify: `lib/ai/instructions/tools.md`

**Step 1: Update `artifacts.md` — createDocument section**

Replace the `### createDocument` section:

```markdown
### createDocument

Use when the user wants substantial content (>10 lines), code, or something they will save or reuse: emails, essays, scripts, reports.

Do not use for explanations, conversational replies, or when the user says to keep it in chat.

CRITICAL RULES:
- Call createDocument at most ONCE per response. Never create multiple documents in a single response.
- After calling createDocument, do NOT call it again in subsequent tool-use steps within the same response.
- If a document already exists in the conversation (you can see a previous createDocument or updateDocument tool call in the message history), use updateDocument instead of creating a new one.

TEXT DOCUMENTS: You are the author. Write the complete document content in the `content` parameter. Use all available context — conversation history, web search results, user preferences — to produce the final document. Do not provide a title and expect the system to generate content for you.

CODE and SHEET artifacts: Do not provide `content` — the system generates structured output from the title.
```

**Step 2: Update `artifacts.md` — updateDocument section**

Replace the `### updateDocument` section:

```markdown
### updateDocument

Use updateDocument when modifying an existing document. Look at the conversation history for the document ID from a previous createDocument or updateDocument result — pass that same ID.

TEXT DOCUMENTS: Provide the complete updated document in the `content` parameter. Include all content, not just the changed parts — the entire document is replaced. Also provide a brief `description` of what changed.

CODE and SHEET artifacts: Provide only a `description` of the changes needed — the system handles the structured update.

Never update a document immediately after creating it in the same response — wait for user feedback.
```

**Step 3: Update `tools.md` tool inventory entries**

```markdown
- **createDocument(title, kind, content?)** — Create a text, code, or sheet artifact. For text documents, provide the full markdown content in the `content` parameter — you write the document. For code and sheet, content is generated from the title.
- **updateDocument(id, description, content?)** — Modify an existing artifact. For text documents, provide the full updated markdown in `content`. For code and sheet, provide a `description` of the changes.
```

**Step 4: Verify build, commit**

```
docs(ai): update artifact instructions for direct content generation
```

---

## Phase 2: Progressive rendering via tool call streaming (client-side)

### Background

After Phase 1, the model generates `content` as a tool parameter. But `execute` only fires after ALL args are complete — so the artifact panel shows nothing until the full document is generated, then renders everything at once. This is poor UX for long documents.

AI SDK v6 streams tool call arguments by default. The `messages` array from `useChat` contains tool invocation parts with progressive states:

```
input-streaming  → partial args (DeepPartial), content growing token-by-token
input-available  → all args complete, execute about to fire
output-available → execute finished, document saved
```

We can watch for `input-streaming` on `createDocument`/`updateDocument` parts and progressively render the `content` field in the artifact panel BEFORE `execute` fires.

### Data flow after Phase 2

```
Model generates createDocument({title, kind, content: "growing..."})
  ↓ (tool call streaming, before execute)
Client: messages[].parts has tool-createDocument with state='input-streaming'
  ↓
ToolStreamHandler extracts input.title, input.kind, input.content
  ↓
setArtifact({ title, kind, content, status: 'streaming', isVisible: true })
  ↓ (artifact panel opens, content renders progressively)
Model finishes generating args → state='input-available'
  ↓
execute fires → saves to DB → sends data-id, data-finish
  ↓
DataStreamHandler picks up data-id (documentId) and data-finish (status: 'idle')
```

Two handlers cooperate:
- **ToolStreamHandler**: drives title, kind, content, opens panel (from tool call streaming)
- **DataStreamHandler**: sets documentId and finalises status (from `execute`'s custom data parts)

---

### Task 6: Create `ToolStreamHandler` component

**Files:**
- Create: `components/tool-stream-handler.tsx`

**Step 1: Implement the component**

```typescript
"use client";

import { useEffect, useRef } from "react";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import type { ChatMessage } from "@/lib/types";

// Tool names that produce artifact content via tool call streaming
const ARTIFACT_TOOLS = new Set(["createDocument", "updateDocument"]);

export function ToolStreamHandler({
  messages,
}: {
  messages: ChatMessage[];
}) {
  const { setArtifact } = useArtifact();
  const prevContentRef = useRef<string>("");

  useEffect(() => {
    // Find the latest assistant message
    const lastAssistant = messages.findLast((m) => m.role === "assistant");
    if (!lastAssistant?.parts) return;

    // Find an active artifact tool invocation in input-streaming state
    const streamingPart = lastAssistant.parts.find(
      (part) =>
        "toolName" in part &&
        ARTIFACT_TOOLS.has((part as any).toolName) &&
        "state" in part &&
        (part as any).state === "input-streaming"
    ) as any;

    if (!streamingPart?.input) return;

    const { title, kind, content } = streamingPart.input;

    // Only update if content actually changed (avoid unnecessary renders)
    if (content && content !== prevContentRef.current) {
      prevContentRef.current = content;

      setArtifact((draft) => ({
        ...draft,
        title: title || draft.title,
        kind: kind || draft.kind,
        content: content,
        status: "streaming",
        isVisible:
          content.length > 400 && content.length < 450
            ? true
            : draft.isVisible || content.length > 200,
      }));
    } else if (kind && !content) {
      // Early: we have kind/title but content hasn't started yet
      setArtifact((draft) => ({
        ...draft,
        title: title || draft.title,
        kind: kind || draft.kind,
        content: "",
        status: "streaming",
      }));
    }
  }, [messages, setArtifact]);

  // Reset ref when streaming finishes
  useEffect(() => {
    const lastAssistant = messages.findLast((m) => m.role === "assistant");
    if (!lastAssistant?.parts) return;

    const hasActiveStreaming = lastAssistant.parts.some(
      (part) =>
        "toolName" in part &&
        ARTIFACT_TOOLS.has((part as any).toolName) &&
        "state" in part &&
        (part as any).state === "input-streaming"
    );

    if (!hasActiveStreaming) {
      prevContentRef.current = "";
    }
  }, [messages]);

  return null;
}
```

**Key design decisions:**
- Uses `prevContentRef` to avoid setting state when content hasn't changed
- Opens the artifact panel when content exceeds 200 chars (gives the title/kind time to arrive)
- Resets when no active streaming tool call is present
- Handles both `createDocument` and `updateDocument`

**Step 2: Verify build**

Run: `pnpm build`

**Step 3: Commit**

```
feat(ui): add ToolStreamHandler for progressive artifact rendering
```

---

### Task 7: Integrate `ToolStreamHandler` into component tree

**Files:**
- Modify: `components/chat.tsx`

**Step 1: Import and render alongside DataStreamHandler**

The `DataStreamHandler` is rendered elsewhere (likely in a layout or provider). The `ToolStreamHandler` needs access to `messages` from `useChat`. The `Chat` component in `components/chat.tsx` has both `messages` and renders `<Artifact>` which already receives `messages`.

Add `ToolStreamHandler` inside the Chat component's JSX, after the `<Artifact>` component:

```typescript
import { ToolStreamHandler } from "./tool-stream-handler";

// In the JSX return, after <Artifact ... />:
<ToolStreamHandler messages={messages} />
```

**Step 2: Verify build, commit**

```
feat(ui): integrate ToolStreamHandler into chat component
```

---

### Task 8: Skip `data-textDelta` when content is provided (server-side)

**Files:**
- Modify: `artifacts/text/server.ts`

**Step 1: Remove `data-textDelta` from the direct content path**

When `content` is provided, the `ToolStreamHandler` already rendered it progressively via tool call streaming. Sending `data-textDelta` from `execute` would cause a duplicate flash (DataStreamHandler would append it again).

Update both `onCreateDocument` and `onUpdateDocument`:

```typescript
// In onCreateDocument:
if (content) {
  // Content already streamed to artifact panel via tool call streaming.
  // No data-textDelta needed — ToolStreamHandler handled rendering.
  return content;
}

// In onUpdateDocument:
if (content) {
  return content;
}
```

**Step 2: Verify build, commit**

```
fix(ai): skip data-textDelta when content provided via tool call streaming
```

---

### Task 9: Handle artifact panel visibility trigger

**Files:**
- Modify: `components/tool-stream-handler.tsx`
- Modify: `components/message.tsx` (if needed)

**Step 1: Ensure artifact panel opens on tool stream**

Currently the artifact panel opens via `isVisible` on the artifact state. The `DataStreamHandler` sets `isVisible` implicitly through status changes, and the `DocumentPreview` component in `message.tsx` also triggers visibility via click/bounding box.

In `ToolStreamHandler`, ensure `isVisible: true` is set once we have enough content:

```typescript
// Already handled in Task 6 — isVisible is set when content.length > 200
// This gives the model time to generate title + kind before showing the panel
```

**Step 2: Verify the `DocumentPreview` in `message.tsx` still works**

The `DocumentPreview` component renders for `tool-createDocument` parts. During `input-streaming`, the part has partial input. Verify it doesn't crash on `DeepPartial` input (title might be incomplete). If needed, add a null guard:

Check `components/message.tsx` around the `tool-createDocument` rendering. The `input.title` from a `DeepPartial` could be `undefined` — add fallback:

```typescript
// If rendering DocumentPreview during input-streaming:
title={part.input?.title ?? "Creating document..."}
```

**Step 3: Commit**

```
fix(ui): handle partial tool input in artifact panel visibility
```

---

### Task 10: Verify end-to-end with progressive streaming

**Step 1: Run dev server**

Run: `pnpm dev`

**Step 2: Manual test — create text document with streaming**

1. Open a new chat
2. Ask: "Write me a detailed essay about the history of jazz music"
3. Verify: artifact panel opens BEFORE the model finishes generating the tool call
4. Verify: content renders progressively (character-by-character) in the artifact panel
5. Verify: when generation finishes, status transitions from "streaming" to "idle"
6. Verify: only ONE `[createDocument]` log — no `updateDocument` call
7. Verify: DOCX and PDF export serve the correct content

**Step 3: Manual test — update text document with streaming**

1. In the same chat, ask: "Make it shorter and focus on the 1950s"
2. Verify: artifact panel clears and streams the updated content progressively
3. Verify: the document ID stays the same

**Step 4: Manual test — code artifact (regression)**

1. In a new chat, ask: "Write a Python function to calculate Fibonacci numbers"
2. Verify: code artifact works as before (inner generation, no `ToolStreamHandler` interference)
3. The `ToolStreamHandler` should ignore code tool calls since the `input` won't have a `content` field

**Step 5: Edge case — short document**

1. Ask: "Create a document with just 'Hello World'"
2. Verify: still works (panel may open later due to the 200-char threshold — that's fine)

---

### Task 11: Final build and commit

**Step 1: Full build check**

Run: `pnpm build`

**Step 2: Review all changes**

Ensure:
- No dead code from old `data-textDelta` paths (fallback still uses it for code/sheet)
- Types are consistent
- No regressions in DataStreamHandler for non-text artifacts

**Step 3: Final commit if any cleanup needed**

```
chore(ai): clean up artifact generation after direct content refactor
```

---

## Architecture summary

```
BEFORE (2 generations, no context):
  Model → createDocument({title}) → execute → inner streamText("Write about {title}") → data-textDelta → artifact panel
  Model sees generic content → updateDocument → ANOTHER inner streamText → overwrites

AFTER (1 generation, full context, progressive streaming):
  Model → createDocument({title, kind, content: "..."})
    ├── Tool call streaming → ToolStreamHandler → artifact panel (progressive)
    └── execute → save to DB → data-id + data-finish → DataStreamHandler (metadata)
```

## Critical assessment

- **Token savings**: Eliminates the inner `streamText` call entirely for text. The model generates content once with full conversation context instead of a blind title-only generation followed by an update.
- **UX**: Progressive rendering via tool call streaming means the user sees content appearing as the model writes it, similar to Claude.ai.
- **Backwards compatibility**: Code and sheet artifacts are untouched. The `content` parameter is optional with a fallback path.
- **Risk**: The `ToolStreamHandler` depends on AI SDK v6's `input-streaming` state shape. If the partial args format changes between AI SDK versions, this breaks. Pin the AI SDK version.
- **Risk**: The `DeepPartial` input during streaming means `title`, `kind`, and `content` may be undefined or incomplete at any point. The handler must be defensive.
- **Not addressed**: The `requestSuggestions` tool still uses an inner `streamText` — this is a separate concern and lower priority.
