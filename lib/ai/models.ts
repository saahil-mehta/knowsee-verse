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
  maxContextTokens: number;
  pricing: ModelPricing;
};

export const chatModels: ChatModel[] = [
  {
    id: "anthropic/claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    provider: "anthropic",
    description: "Balanced quality, speed, and cost",
    maxContextTokens: 200_000,
    pricing: { inputPerMTok: 3, outputPerMTok: 15, cacheReadPerMTok: 0.3 },
  },
  {
    id: "anthropic/claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    provider: "anthropic",
    description: "Fast and lightweight",
    maxContextTokens: 200_000,
    pricing: { inputPerMTok: 0.8, outputPerMTok: 4, cacheReadPerMTok: 0.08 },
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
