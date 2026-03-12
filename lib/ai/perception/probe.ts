import { gateway } from "@ai-sdk/gateway";
import { generateText } from "ai";
import type { ProbeModelConfig, ProbePrompt, ProbeResult } from "./types";

const CONCURRENCY_PER_MODEL = 5;
const TIMEOUT_MS = 30_000;

const PROBE_SYSTEM_PROMPT =
  "You are a helpful assistant. Answer the user's question directly and thoroughly.";

/**
 * Run prompts through a concurrency-limited queue.
 * Resolves to an array of ProbeResult[] in order.
 */
async function withConcurrencyLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<ProbeResult>
): Promise<ProbeResult[]> {
  const results: ProbeResult[] = [];
  let idx = 0;

  async function next(): Promise<void> {
    const current = idx++;
    if (current >= items.length) {
      return;
    }
    results[current] = await fn(items[current]);
    return next();
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, next)
  );
  return results;
}

/**
 * Probe a single model with all prompts, respecting concurrency limits.
 */
export async function probeModel(
  model: ProbeModelConfig,
  prompts: ProbePrompt[],
  onResult?: (result: ProbeResult, prompt: ProbePrompt, index: number) => void,
  onProgress?: (message: string) => void
): Promise<ProbeResult[]> {
  onProgress?.(`Probing ${model.label} with ${prompts.length} prompts...`);

  let completed = 0;
  const results = await withConcurrencyLimit(
    prompts,
    CONCURRENCY_PER_MODEL,
    async (prompt) => {
      const start = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const { text } = await generateText({
          model: gateway(model.id),
          system: PROBE_SYSTEM_PROMPT,
          prompt: prompt.text,
          abortSignal: controller.signal,
        });

        const result: ProbeResult = {
          promptId: prompt.id,
          modelId: model.id,
          response: text,
          durationMs: Date.now() - start,
        };

        completed++;
        onResult?.(result, prompt, completed);
        return result;
      } finally {
        clearTimeout(timeout);
      }
    }
  );

  onProgress?.(`${model.label} complete — ${results.length} responses`);
  return results;
}

/**
 * Probe all models in parallel. Fails loudly if any model errors.
 */
export async function probeAllModels(
  models: ProbeModelConfig[],
  prompts: ProbePrompt[],
  onResult?: (
    model: ProbeModelConfig,
    result: ProbeResult,
    prompt: ProbePrompt,
    index: number
  ) => void,
  onProgress?: (message: string) => void
): Promise<ProbeResult[]> {
  onProgress?.(
    `Probing ${models.length} models with ${prompts.length} prompts each...`
  );

  const allResults = await Promise.all(
    models.map((model) =>
      probeModel(
        model,
        prompts,
        (result, prompt, index) => onResult?.(model, result, prompt, index),
        onProgress
      )
    )
  );

  return allResults.flat();
}
