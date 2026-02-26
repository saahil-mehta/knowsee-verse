# Chat branching — summarise and continue

**Date**: 26 February 2026
**Status**: Design

## Context

Long conversations accumulate context tokens. With Sonnet at $3/$15 per MTok, a conversation approaching 200k tokens sends the full window on every turn — a compounding cost that degrades both quality and economics. Users currently have no way to carry forward the useful parts of a conversation without manually starting a new chat and re-explaining everything.

This feature lets users branch a conversation into a new chat seeded with a task-focused summary of the original. The old chat is preserved. The new chat starts with a clean context window and renewed focus.

Anthropic's own approach to context management informed the summary logic. Their compaction strategy drops stale tool calls and results while preserving conversational structure and current task context. We apply the same principle: the summary captures what matters (goals, decisions, artifact references) and discards what doesn't (tool call noise, dead-end explorations, verbose intermediate outputs).

## UX

### Manual trigger

A branch icon button sits to the right of the existing upvote/downvote actions on assistant messages. It appears on every assistant message, not just the last one — the user may want to branch from a specific point mid-conversation because the discussion forked and a different thread deserves its own context. When clicked:

1. An inline card slides in below the message — not a modal. Styled consistently with the existing tool cards (soft border, muted background). Contains:
   - Label: "Summarise and continue in a new chat"
   - Single-line text input pre-filled with the chat title, editable, placeholder: "Focus on..."
   - Two buttons: **Continue** and **Cancel**
2. Clicking **Continue** shows a brief loading state ("Summarising...") within the card.
3. On completion, the browser navigates to the new chat. The old chat remains in the sidebar history unchanged.

When branching from a mid-conversation message, only messages up to and including that message are summarised. Everything after it is excluded. This lets the user fork precisely where the conversation diverged, carrying forward only the relevant context and saving tokens on everything that followed.

### Auto-nudge

When context usage crosses **70%**, a persistent banner appears above the input field:

> Context is filling up. **Summarise and continue →**

The banner is dismissible. If dismissed, it reappears at **85%**. Clicking the action opens the same inline card flow, anchored above the input rather than on a specific message.

### The new chat

The branched chat opens with a persistent branch origin bar pinned at the top of the message area, above all messages. This is not a message — it is a small, muted notification bar:

> Branched from **[old chat title]** · [View original →]

The link navigates to the source chat. This bar is always visible so the user never loses track of where the conversation came from. Below the bar, the first message is the summary context (styled with muted background, smaller text, not editable). The input field is focused and ready. The model selector is unlocked since no user messages have been sent yet.

## Summary generation

The summary is generated server-side using `generateText` with the title model (Haiku 4.5) for cost efficiency. The prompt follows Anthropic's compaction philosophy:

**Preserved in the summary:**
- The user's current goal or task
- Key decisions made during the conversation
- Artifact/document IDs and their titles (so `updateDocument` works in the new chat)
- Any unresolved questions or next steps

**Dropped from the summary:**
- Tool call details (createDocument, web_search, web_fetch inputs/outputs)
- Reasoning tokens and intermediate thinking
- Verbose code output already captured in artifacts
- Conversational filler (greetings, acknowledgements, corrections)

The user's optional "Focus on..." input is appended to the summarisation prompt to steer what gets preserved.

## Architecture

### Data flow

```
User clicks branch on a message → POST /api/chat/branch
  → Load messages from DB for source chat
  → If branchFromMessageId provided, truncate to messages up to that point
  → generateText() with Haiku to produce summary
  → Create new Chat row (with parentChatId reference)
  → Save summary as first system-context message in new chat
  → Return { newChatId, summary }
Client navigates to /chat/{newChatId}
```

### Schema change

Add an optional `parentChatId` column to the `Chat` table to link branched chats back to their source. This enables the "Continued from..." link and future analytics on branching patterns.

```typescript
// lib/db/schema.ts — Chat table addition
parentChatId: uuid("parentChatId").references(() => chat.id),
```

No new tables needed. The summary is stored as a regular message (role: `system` or `assistant`) in the new chat's message history.

### New API route

**`POST /api/chat/branch`**

Request body:
```typescript
{
  sourceChatId: string;
  branchFromMessageId?: string; // if set, only summarise up to this message
  focusPrompt?: string;         // user's optional "Focus on..." input
  selectedChatModel: string;    // carry forward the model selection
  visibility: VisibilityType;
}
```

Response:
```typescript
{
  newChatId: string;
  summary: string;
}
```

The route:
1. Validates session ownership of the source chat
2. Loads messages from the source chat via `getMessagesByChatId`
3. If `branchFromMessageId` is provided, truncates the message list to include only messages up to and including that message (by `createdAt` ordering)
4. Converts to model messages and builds a summarisation prompt
5. Calls `generateText` with Haiku to produce the summary
6. Creates a new chat with `parentChatId` set to the source
7. Saves the summary as the first message in the new chat
8. Returns the new chat ID

### Summarisation prompt

```typescript
// lib/ai/instructions/branch.md
const branchPrompt = `Summarise the following conversation for continuity in a new chat session.

Focus on:
- The user's current goal or task
- Key decisions and conclusions reached
- Document/artifact IDs and titles that were created or modified
- Any unresolved questions or pending next steps

Omit:
- Tool call details and intermediate outputs
- Verbose code that is already saved in artifacts
- Conversational filler and corrections

Keep the summary under 500 words. Write in second person ("You were working on...") so it reads naturally as context for the model in the new chat.

${focusPrompt ? `The user wants to focus on: ${focusPrompt}` : ""}`;
```

### Components

**New files:**
- `components/branch-chat-card.tsx` — the inline card UI (label, focus input, buttons, loading state)
- `components/branch-chat-banner.tsx` — the auto-nudge banner above input
- `components/branch-origin-bar.tsx` — persistent "Branched from..." notification bar at top of branched chats
- `lib/ai/instructions/branch.md` — summarisation prompt template
- `app/(chat)/api/chat/branch/route.ts` — API route handler

**Modified files:**
- `components/message-actions.tsx` — add branch icon button to assistant message actions (receives `messageId` for mid-conversation branching)
- `components/multimodal-input.tsx` — render the auto-nudge banner when context threshold is crossed
- `components/messages.tsx` — render branch origin bar at top of branched chats
- `components/elements/context-indicator.tsx` — expose the percentage calculation for the nudge threshold
- `lib/db/schema.ts` — add `parentChatId` to Chat table
- `lib/db/queries.ts` — add `getChatParent` query for resolving branch origin
- `components/icons.tsx` — add branch icon (GitBranch from Lucide or similar)

### Context threshold detection

The context indicator already calculates `percent = usedTokens / maxContextTokens`. The auto-nudge needs access to this value. Rather than duplicating the calculation, we lift the percentage into a shared source:

- The `ContextIndicator` already receives `usage` and `maxContextTokens`
- The `MultimodalInput` receives the same data
- We compute the percentage in `MultimodalInput` and conditionally render `BranchChatBanner`

No new state management needed — it piggybacks on the existing `usage` data flowing through props.

## Edge cases

**No messages to summarise**: If the conversation has fewer than 4 messages, the branch button is hidden. There is nothing meaningful to summarise.

**Mid-conversation branching**: When the user branches from an earlier message, only messages up to that point are included in the summary. This is a simple filter on `createdAt` ordering — no structural changes needed. The resulting summary naturally excludes later discussion, giving the new chat a focused starting point from exactly where the user chose to fork.

**Summary generation fails**: Show an error state in the inline card ("Failed to generate summary. Try again.") with a retry button. Do not navigate away.

**Artifact references**: The summary must include document IDs verbatim so the model in the new chat can call `updateDocument` with the correct ID. The summarisation prompt explicitly requests this.

**Model selection**: The new chat inherits the model from the source chat. Since no messages have been sent, the model selector is unlocked and the user can change it before their first message.

**Visibility**: The new chat inherits the visibility setting from the source chat.

## Out of scope (post-MVP)

- Multiple branches from the same source (works naturally via `parentChatId` but no UI to visualise the tree)
- Merging branches back together
- Auto-branching without user confirmation
- Full branch tree visualisation in the sidebar (beyond the simple origin bar)

## Cost estimate

The summary generation uses Haiku at $0.80/$4 per MTok. For a 100k-token conversation, the summarisation input is roughly 100k tokens ($0.08) and output is ~500 tokens ($0.002). Total cost per branch: **under $0.10**. This is a one-time cost that prevents the user from continuing to spend $0.30+ per turn in an overloaded conversation.
