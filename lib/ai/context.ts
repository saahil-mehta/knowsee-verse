import type { ModelMessage } from "ai";
import { pruneMessages } from "ai";

export function compactMessages(messages: ModelMessage[]): ModelMessage[] {
  return pruneMessages({
    messages,
    reasoning: "before-last-message",
    emptyMessages: "remove",
  });
}
