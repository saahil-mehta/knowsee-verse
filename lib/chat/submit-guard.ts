import type { UseChatHelpers } from "@ai-sdk/react";
import type { ChatMessage } from "@/lib/types";

type ChatStatus = UseChatHelpers<ChatMessage>["status"];

export type SubmitAction = "send" | "clear-and-send" | "block";

/**
 * Decide what a message submit should do given the current chat status.
 *
 * - "ready": normal send.
 * - "error": the previous stream failed (commonly a severed connection, e.g. a
 *   serverless function timeout cutting a long agentic run). The AI SDK leaves
 *   status at "error" and `stop()` is a no-op there, so without this the input
 *   stays locked behind the "wait for the model" guard until a full page refresh.
 *   Clear the error, then send.
 * - "submitted"/"streaming": a request is genuinely in flight, block and warn.
 */
export function resolveSubmitAction(status: ChatStatus): SubmitAction {
  if (status === "ready") {
    return "send";
  }
  if (status === "error") {
    return "clear-and-send";
  }
  return "block";
}
