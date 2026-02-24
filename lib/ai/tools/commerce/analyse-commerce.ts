import { generateObject, tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import type { Session } from "@/lib/auth";
import type { ChatMessage } from "@/lib/types";
import {
  auditResultSchema,
  comparisonResultSchema,
  productDataSchema,
} from "../../commerce/schemas";
import { getLanguageModel } from "../../providers";

type AnalyseCommerceProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

export const createAnalyseCommerceTool = ({
  session: _session,
  dataStream: _dataStream,
}: AnalyseCommerceProps) =>
  tool({
    description:
      'Analyse commerce data to produce either a product comparison table or a brand commerce readiness audit scorecard. Use type "comparison" after extracting multiple products, or type "audit" after browsing a brand site.',
    inputSchema: z.object({
      type: z
        .enum(["comparison", "audit"])
        .describe(
          '"comparison" for side-by-side product analysis, "audit" for brand readiness scorecard'
        ),
      products: z
        .array(productDataSchema)
        .optional()
        .describe("Products to compare (required for comparison type)"),
      auditUrl: z
        .string()
        .url()
        .optional()
        .describe("Brand URL that was audited (required for audit type)"),
      auditFindings: z
        .array(
          z.object({
            category: z.string().describe("Audit category name"),
            observations: z
              .string()
              .describe("Key observations for this category"),
          })
        )
        .optional()
        .describe("Structured findings from browsing the brand site"),
    }),
    execute: async ({ type, products, auditUrl, auditFindings }) => {
      if (type === "comparison") {
        if (!products || products.length < 2) {
          return {
            error: "At least 2 products are required for a comparison.",
          };
        }

        const { object } = await generateObject({
          model: getLanguageModel("claude-sonnet-4-5"),
          schema: comparisonResultSchema,
          prompt: `Compare these products and produce a structured comparison result.

Products:
${JSON.stringify(products, null, 2)}

Instructions:
- Create meaningful comparison dimensions (Price, Rating, Availability, Features, Value for Money)
- Identify a winner for each dimension
- Choose an overall winner with clear reasoning
- If applicable, estimate savings vs the next-best option
- Be objective and data-driven`,
        });

        return object;
      }

      // Audit flow
      const findings = auditFindings
        ? auditFindings
            .map((f) => `${f.category}: ${f.observations}`)
            .join("\n")
        : "No specific findings provided — assess based on general commerce best practices.";

      const { object } = await generateObject({
        model: getLanguageModel("claude-sonnet-4-5"),
        schema: auditResultSchema,
        prompt: `Produce a commerce readiness audit scorecard for ${auditUrl ?? "the brand"}.

Findings from site review:
${findings}

Instructions:
- Score overall readiness 0–100
- Assess categories: Product Discovery, Mobile UX, Checkout Flow, Search Quality, Agentic Readiness
- Provide specific findings for each category
- Give actionable recommendations for improvement
- Be fair but critical — this is for a digital agency client`,
      });

      return object;
    },
  });
