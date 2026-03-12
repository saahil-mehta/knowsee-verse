import type { InferUITool, UIMessage } from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/components/artifact";
import type { createBrandAudit } from "./ai/tools/brand-audit";
import type { createBrandPerception } from "./ai/tools/brand-perception";
import type { createDocument } from "./ai/tools/create-document";

import type { requestSuggestions } from "./ai/tools/request-suggestions";
import type { createServerTools } from "./ai/tools/server-tools";
import type { updateDocument } from "./ai/tools/update-document";
import type { Suggestion } from "./db/schema";

export type DataPart = { type: "append-message"; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;

type ServerTools = ReturnType<typeof createServerTools>;
type webSearchTool = InferUITool<ServerTools["web_search"]>;
type webFetchTool = InferUITool<ServerTools["web_fetch"]>;
type brandAuditTool = InferUITool<ReturnType<typeof createBrandAudit>>;
type brandPerceptionTool = InferUITool<
  ReturnType<typeof createBrandPerception>
>;
export type ChatTools = {
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
  web_search: webSearchTool;
  web_fetch: webFetchTool;
  brand_audit: brandAuditTool;
  brand_perception: brandPerceptionTool;
};

export type UsageData = {
  /** Last-step tokens — actual context window occupancy. */
  inputTokens: number;
  outputTokens: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
  /** Cumulative tokens across all agentic steps — for cost calculation. */
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCachedInputTokens?: number;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  "chat-title": string;
  usage: UsageData;
  "research-step": string;
  "probe-result": {
    modelId: string;
    modelLabel: string;
    promptText: string;
    response: string;
    index: number;
    total: number;
  };
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};
