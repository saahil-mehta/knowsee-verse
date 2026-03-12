# Conversation Compaction Plan

**Status:** Deferred — prerequisite context visibility (Task 11) shipped first
**Reference:** [Vercel community thread](https://community.vercel.com/t/how-to-implement-conversation-compaction-with-ai-sdk-v5/29171)

---

## Problem

Long conversations consume the full context window. Once full, model quality degrades. The context indicator (now shipped) makes this visible — compaction solves it.

## Approach

Use `prepareStep` in `streamText` to dynamically summarise old messages and inject the summary into the system prompt.

### Mechanism

1. On step 0, check if `messages.length > THRESHOLD` (start with 20)
2. Split: old messages (to summarise) vs recent messages (last 10, kept verbatim)
3. Call `generateText` with Haiku to produce a concise summary of old messages
4. Return `{ system: originalSystem + summary, messages: recentMessages }`
5. On subsequent steps (tool loops), return `undefined` to keep the compacted context

### Key type

```typescript
// prepareStep is available in ai@6.0.97
streamText({
  prepareStep: async ({ messages, stepNumber }) => {
    if (stepNumber > 0 || messages.length <= THRESHOLD) return undefined;
    // ... summarise and slice
    return { system: compactedSystem, messages: recentMessages };
  },
});
```

### Open questions

- **Threshold:** Message count vs token count? Message count is simpler but less precise.
- **Summary caching:** Generate once and cache in the chat record (DB), or regenerate each request? DB storage avoids repeated Haiku calls but adds schema changes.
- **Frontend awareness:** Should the client know compaction happened? Could show "Summarised N earlier messages" in the context indicator tooltip.
- **Pruning interaction:** `compactMessages` (pruning) runs on all messages before compaction. Should it also run on the recent slice post-compaction?

### Files

| File | Action |
|------|--------|
| `lib/ai/context.ts` | Extend with `prepareCompaction()` |
| `app/(chat)/api/chat/route.ts` | Add `prepareStep` to `streamText` |
| `lib/db/schema.ts` | Optional: add `summary` column to chat table |

### Estimated effort

Small — 1-2 hours. The hardest part is deciding on caching strategy.
