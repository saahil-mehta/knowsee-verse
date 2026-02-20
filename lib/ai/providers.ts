import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { chatModels } from "./models";
import { isTestEnvironment } from "../constants";

const groq = createGroq();
const google = createGoogleGenerativeAI();

// ---------------------------------------------------------------------------
// Provider routing — resolves a model ID to the correct provider backend.
// ---------------------------------------------------------------------------

/** Lookup a model's provider from the registry. */
function getProviderForModel(modelId: string): string {
  const entry = chatModels.find((m) => m.id === modelId);
  return entry?.provider ?? "groq";
}

/** Return a LanguageModel for the given model ID, routed to the right provider. */
function resolveModel(modelId: string) {
  const provider = getProviderForModel(modelId);

  switch (provider) {
    case "google":
      return google(modelId);
    default:
      return groq(modelId);
  }
}

// ---------------------------------------------------------------------------
// Test environment — mock provider
// ---------------------------------------------------------------------------

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : null;

// ---------------------------------------------------------------------------
// Public API — used by route.ts, actions.ts, and artifact handlers.
// ---------------------------------------------------------------------------

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  const isReasoningModel =
    modelId.includes("reasoning") || modelId.endsWith("-thinking");

  if (isReasoningModel) {
    return wrapLanguageModel({
      model: resolveModel(modelId),
      middleware: extractReasoningMiddleware({ tagName: "thinking" }),
    });
  }

  return resolveModel(modelId);
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }
  return groq("openai/gpt-oss-20b");
}

export function getArtifactModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("artifact-model");
  }
  return groq("openai/gpt-oss-20b");
}
