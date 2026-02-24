// Barrel re-export — all prompt logic now lives in lib/ai/instructions/.
// This file exists solely so existing imports from "@/lib/ai/prompts" continue
// to resolve without changes across the codebase.

export type { ChatMode, RequestHints } from "./instructions";
export {
  artifactsPrompt,
  codePrompt,
  commercePrompt,
  getRequestPromptFromHints,
  regularPrompt,
  sheetPrompt,
  systemPrompt,
  titlePrompt,
  updateDocumentPrompt,
} from "./instructions";
