export type ProbeModelConfig = {
  id: string; // gateway model ID, e.g. "openai/gpt-4o-mini"
  label: string; // human-readable, e.g. "ChatGPT GPT-4o-mini"
};

export type PromptCategory =
  | "category-discovery"
  | "brand-comparison"
  | "recommendation"
  | "purchase-intent";

export type ProbePrompt = {
  id: string;
  category: PromptCategory;
  text: string;
};

export type ProbeResult = {
  promptId: string;
  modelId: string;
  response: string;
  durationMs: number;
};

export type ExtractionResult = {
  promptId: string;
  modelId: string;
  mentioned: boolean;
  position: number | null;
  sentiment: number; // 1-5
  recommendationStrength: number; // 1-5
  competitorsMentioned: string[];
  reasoning: string;
};

export type ModelSummary = {
  modelId: string;
  modelLabel: string;
  mentionRate: number; // 0-100
  avgPosition: number | null;
  avgSentiment: number;
  avgRecommendation: number;
  promptCount: number;
};

export type CategorySummary = {
  category: string;
  scores: Record<string, number>; // brand/competitor name -> 0-100
};

export type AuditSummary = {
  overallScore: number;
  modelResults: ModelSummary[];
  categoryResults: CategorySummary[];
  competitorMentions: Record<string, number>;
  promptCount: number;
  modelsQueried: string[];
  durationMs: number;
};
