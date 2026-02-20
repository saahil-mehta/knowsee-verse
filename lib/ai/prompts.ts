// Barrel re-export — all prompt logic now lives in lib/ai/instructions/.
// This file exists solely so existing imports from "@/lib/ai/prompts" continue
// to resolve without changes across the codebase.
export {
  artifactsPrompt,
  codePrompt,
  getRequestPromptFromHints,
  regularPrompt,
  sheetPrompt,
  systemPrompt,
  titlePrompt,
  updateDocumentPrompt,
} from "./instructions";
export type { RequestHints } from "./instructions";
