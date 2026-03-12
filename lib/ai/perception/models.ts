import type { ProbeModelConfig } from "./types";

export const PROBE_MODELS: ProbeModelConfig[] = [
  { id: "openai/gpt-4o-mini", label: "ChatGPT GPT-4o Mini" },
  { id: "google/gemini-2.0-flash", label: "Google Gemini 2.0 Flash" },
  { id: "mistral/mistral-small-latest", label: "Mistral Small" },
  { id: "anthropic/claude-haiku-4-5", label: "Claude Haiku 4.5" },
];

export const EXTRACTION_MODEL = "anthropic/claude-haiku-4-5";
