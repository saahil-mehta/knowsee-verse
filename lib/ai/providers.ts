import { gateway } from "@ai-sdk/gateway";
import { customProvider } from "ai";
import { isTestEnvironment } from "../constants";

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
// Model resolution — strips internal suffixes before sending to the gateway.
// ---------------------------------------------------------------------------

function resolveModel(modelId: string) {
  return gateway(modelId);
}

// ---------------------------------------------------------------------------
// Public API — used by route.ts, actions.ts, and artifact handlers.
// ---------------------------------------------------------------------------

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  return resolveModel(modelId);
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }
  return gateway("anthropic/claude-haiku-4-5");
}

export function getArtifactModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("artifact-model");
  }
  return gateway("anthropic/claude-haiku-4-5");
}
