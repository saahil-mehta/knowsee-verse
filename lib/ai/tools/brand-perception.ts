import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import {
  aggregateResults,
  formatSummaryForClaude,
} from "@/lib/ai/perception/aggregate";
import { extractAll } from "@/lib/ai/perception/extract";
import { PROBE_MODELS } from "@/lib/ai/perception/models";
import { probeAllModels } from "@/lib/ai/perception/probe";
import { generateProbePrompts } from "@/lib/ai/perception/prompts";
import type { Session } from "@/lib/auth";
import { saveVisibilityAudit } from "@/lib/db/queries";
import type { BrandProfile } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";

type BrandPerceptionProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  brandProfile: BrandProfile;
  chatId: string;
};

export const createBrandPerception = ({
  brandProfile,
  dataStream,
  chatId,
}: BrandPerceptionProps) =>
  tool({
    description: `Run an AI visibility audit for ${brandProfile.brandName}. Probes 4 major AI models with purchase-intent prompts, analyses responses, and returns a structured visibility score. Use the results to create a report artifact with createDocument(kind: "report").`,
    inputSchema: z.object({
      focusCategories: z
        .array(z.string())
        .optional()
        .describe("Optional subset of categories to focus the audit on"),
    }),
    execute: async ({ focusCategories }) => {
      const start = Date.now();
      const competitors = brandProfile.competitors as string[];

      // Step 1: Generate prompts
      dataStream.write({
        type: "data-research-step" as any,
        data: "Generating probe prompts...",
      });
      const prompts = generateProbePrompts(brandProfile, focusCategories);

      // Initialise probe grid state by sending initial model states
      for (const model of PROBE_MODELS) {
        dataStream.write({
          type: "data-probe-result" as any,
          data: {
            modelId: model.id,
            modelLabel: model.label,
            promptText: "",
            response: "",
            index: 0,
            total: prompts.length,
          },
        });
      }

      // Step 2: Probe models
      const totalProbes = PROBE_MODELS.length * prompts.length;
      let completedProbes = 0;

      dataStream.write({
        type: "data-research-step" as any,
        data: `Probing ${PROBE_MODELS.length} AI models with ${prompts.length} prompts each (${totalProbes} total)...`,
      });

      const probeResults = await probeAllModels(
        PROBE_MODELS,
        prompts,
        (model, result, prompt, index) => {
          completedProbes++;
          dataStream.write({
            type: "data-probe-result" as any,
            data: {
              modelId: model.id,
              modelLabel: model.label,
              promptText: prompt.text,
              response: result.response.substring(0, 200),
              index,
              total: prompts.length,
            },
          });
          dataStream.write({
            type: "data-research-step" as any,
            data: `Probing AI models — ${completedProbes}/${totalProbes} responses received`,
          });
        }
      );

      // Step 3: Extract
      const modelLabels = PROBE_MODELS.map((m) => m.label).join(", ");
      dataStream.write({
        type: "data-research-step" as any,
        data: `Analysing ${probeResults.length} responses across ${modelLabels}...`,
      });

      let extractedCount = 0;
      const extractions = await extractAll(
        probeResults,
        prompts,
        brandProfile.brandName,
        competitors,
        () => {
          extractedCount++;
          dataStream.write({
            type: "data-research-step" as any,
            data: `Analysing responses: ${extractedCount}/${probeResults.length} extracted`,
          });
        }
      );

      // Step 4: Aggregate
      dataStream.write({
        type: "data-research-step" as any,
        data: "Compiling results...",
      });

      const summary = aggregateResults(
        extractions,
        prompts,
        PROBE_MODELS,
        brandProfile,
        Date.now() - start
      );

      // Step 5: Persist to database
      await saveVisibilityAudit({
        projectId: brandProfile.projectId,
        chatId,
        overallScore: summary.overallScore,
        modelResults: summary.modelResults,
        categoryResults: summary.categoryResults,
        competitorResults: summary.competitorMentions,
        probeCount: summary.promptCount,
        modelsQueried: summary.modelsQueried,
      });

      // Step 6: Build probe grid snapshot for UI persistence
      const promptMap = new Map(prompts.map((p) => [p.id, p]));
      const probeGrid = PROBE_MODELS.map((model) => {
        const modelProbes = probeResults.filter((r) => r.modelId === model.id);
        return {
          modelId: model.id,
          modelLabel: model.label,
          completed: modelProbes.length,
          total: prompts.length,
          responses: modelProbes.map((r) => ({
            promptText: promptMap.get(r.promptId)?.text ?? "",
            response: r.response.substring(0, 200),
          })),
        };
      });

      // Step 7: Return summary for Claude + probe grid for UI
      return {
        summary: formatSummaryForClaude(summary, brandProfile.brandName),
        probeGrid,
      };
    },
  });
