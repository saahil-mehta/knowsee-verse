import type { InferUITool, UIMessage } from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/components/artifact";
import type { createCommerceTools } from "./ai/tools/commerce";
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

type CommerceTools = ReturnType<typeof createCommerceTools>;
type browseSiteTool = InferUITool<CommerceTools["browse_site"]>;
type extractProductTool = InferUITool<CommerceTools["extract_product"]>;
type analyseCommerceTool = InferUITool<CommerceTools["analyse_commerce"]>;

export type ChatTools = {
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
  web_search: webSearchTool;
  web_fetch: webFetchTool;
  browse_site: browseSiteTool;
  extract_product: extractProductTool;
  analyse_commerce: analyseCommerceTool;
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
