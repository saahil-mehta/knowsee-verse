export const DEFAULT_CHAT_MODEL = "anthropic/claude-sonnet-4-6";

export type ModelPricing = {
  inputPerMTok: number;
  outputPerMTok: number;
  cacheReadPerMTok?: number;
};

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  strengths: string[];
  maxContextTokens: number;
  pricing: ModelPricing;
};

export const chatModels: ChatModel[] = [
  {
    id: "anthropic/claude-opus-4-6",
    name: "Advanced",
    provider: "knowsee",
    description: "Most capable, for complex tasks",
    strengths: [
      "Deep analysis",
      "Long-form writing",
      "Complex research",
      "Brand audits",
    ],
    maxContextTokens: 200_000,
    pricing: { inputPerMTok: 5, outputPerMTok: 25, cacheReadPerMTok: 0.5 },
  },
  {
    id: "anthropic/claude-sonnet-4-6",
    name: "Balanced",
    provider: "knowsee",
    description: "Balanced quality, speed, and cost",
    strengths: [
      "Balanced quality & speed",
      "Code generation",
      "Document creation",
      "Web research",
    ],
    maxContextTokens: 200_000,
    pricing: { inputPerMTok: 3, outputPerMTok: 15, cacheReadPerMTok: 0.3 },
  },
  {
    id: "anthropic/claude-haiku-4-5",
    name: "Fast",
    provider: "knowsee",
    description: "Fast and lightweight",
    strengths: [
      "Fast responses",
      "Quick lookups",
      "Simple code",
      "Brainstorming",
    ],
    maxContextTokens: 200_000,
    pricing: { inputPerMTok: 1, outputPerMTok: 5, cacheReadPerMTok: 0.1 },
  },
];

// Group models by provider for UI
export const modelsByProvider = chatModels.reduce(
  (acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  },
  {} as Record<string, ChatModel[]>
);
