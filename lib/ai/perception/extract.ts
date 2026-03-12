import { gateway } from "@ai-sdk/gateway";
import { generateObject } from "ai";
import { z } from "zod";
import { EXTRACTION_MODEL } from "./models";
import type { ExtractionResult, ProbePrompt, ProbeResult } from "./types";

const EXTRACTION_CONCURRENCY = 10;

const extractionSchema = z.object({
  mentioned: z
    .boolean()
    .describe("Was the brand explicitly mentioned by name?"),
  position: z
    .number()
    .int()
    .nullable()
    .describe("1-based rank position if listed, null if absent"),
  sentiment: z
    .number()
    .int()
    .describe("1=very negative, 5=very positive. Must be 1, 2, 3, 4, or 5."),
  recommendationStrength: z
    .number()
    .int()
    .describe(
      "1=actively discouraged, 5=strongly recommended. Must be 1, 2, 3, 4, or 5."
    ),
  competitorsMentioned: z
    .array(z.string())
    .describe("Other brand names mentioned"),
  reasoning: z
    .string()
    .describe(
      "Brief 1-2 sentence explanation of why the model did/didn't recommend the brand"
    ),
});

function buildExtractionPrompt(
  brandName: string,
  promptText: string,
  response: string,
  competitors: string[]
): string {
  return `Analyse this AI model response about ${brandName}.

Probe prompt: "${promptText}"
Model response: "${response}"

Known competitors: ${competitors.join(", ")}

Extract structured data about ${brandName}'s presence and positioning in this response.`;
}

/**
 * Run a single extraction against Haiku.
 */
async function extractOne(
  probe: ProbeResult,
  prompt: ProbePrompt,
  brandName: string,
  competitors: string[]
): Promise<ExtractionResult> {
  const { object } = await generateObject({
    model: gateway(EXTRACTION_MODEL),
    schema: extractionSchema,
    prompt: buildExtractionPrompt(
      brandName,
      prompt.text,
      probe.response,
      competitors
    ),
  });

  return {
    promptId: probe.promptId,
    modelId: probe.modelId,
    ...object,
  };
}

/**
 * Extract structured data from all probe results in parallel.
 * Fails loudly — no silent fallbacks.
 */
export async function extractAll(
  probes: ProbeResult[],
  prompts: ProbePrompt[],
  brandName: string,
  competitors: string[],
  onItemComplete?: () => void
): Promise<ExtractionResult[]> {
  const promptMap = new Map(prompts.map((p) => [p.id, p]));
  const results: ExtractionResult[] = [];
  let idx = 0;

  async function next(): Promise<void> {
    const current = idx++;
    if (current >= probes.length) {
      return;
    }
    const probe = probes[current];
    const prompt = promptMap.get(probe.promptId);
    if (!prompt) {
      throw new Error(`Prompt not found for id: ${probe.promptId}`);
    }
    try {
      results[current] = await extractOne(
        probe,
        prompt,
        brandName,
        competitors
      );
    } catch (error) {
      console.error(
        `Extraction failed for prompt ${probe.promptId} / model ${probe.modelId}:`,
        error
      );
      results[current] = {
        promptId: probe.promptId,
        modelId: probe.modelId,
        mentioned: false,
        position: null,
        sentiment: 3,
        recommendationStrength: 3,
        competitorsMentioned: [],
        reasoning: "Extraction failed",
      };
    }
    onItemComplete?.();
    return next();
  }

  await Promise.all(
    Array.from(
      { length: Math.min(EXTRACTION_CONCURRENCY, probes.length) },
      next
    )
  );

  return results;
}
