import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import {
  commerceAuditInstructions,
  genericAuditInstructions,
} from "@/lib/ai/instructions";
import type { Session } from "@/lib/auth";
import type { BrandProfile } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";

type BrandAuditProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  brandProfile: BrandProfile;
};

type PhasePreview = { name: string; description: string };

const COMMERCE_READINESS_PHASES: PhasePreview[] = [
  {
    name: "Structured Data Fidelity",
    description:
      "Audit schema.org Product/Offer/Organization coverage across top pages.",
  },
  {
    name: "Machine-readable Catalogue",
    description:
      "Check product feed availability, completeness, and refresh cadence.",
  },
  {
    name: "DTC Commerce Surface",
    description:
      "Evaluate on-domain purchase capability and agent-transactable checkout.",
  },
  {
    name: "Retailer Integration",
    description:
      "Audit AggregateOffer schema and where-to-buy retailer surfacing.",
  },
  {
    name: "Programmatic Accessibility",
    description:
      "Check robots.txt posture, llms.txt, well-known endpoints, MCP surfaces, and public APIs.",
  },
  {
    name: "Entity Authority",
    description:
      "Verify Organization schema sameAs links and knowledge-graph presence across AI models.",
  },
  {
    name: "Content Answerability",
    description:
      "Audit FAQ/HowTo/QA schema and content readiness for LLM citation.",
  },
  {
    name: "Compliance & Age-gate",
    description:
      "For regulated categories: verify age-gate, jurisdiction logic, and safe-claim controls.",
  },
  {
    name: "Commercial Maturity",
    description:
      "Assess public commitment, partnerships, and agentic-commerce strategy signals.",
  },
];

const GENERIC_PHASES: PhasePreview[] = [
  {
    name: "Research",
    description:
      "Gather evidence from authoritative sources via web_fetch and web_search.",
  },
  {
    name: "Analysis",
    description: "Evaluate findings against the audit criteria.",
  },
  {
    name: "Synthesis",
    description:
      "Combine findings into a structured report using the default analytical shape.",
  },
  {
    name: "Recommendations",
    description: "Produce severity-tiered, evidence-anchored recommendations.",
  },
];

const INSTRUCTIONS_BY_TYPE: Record<string, string> = {
  commerce_readiness: commerceAuditInstructions,
};

const PHASES_BY_TYPE: Record<string, PhasePreview[]> = {
  commerce_readiness: COMMERCE_READINESS_PHASES,
};

export const createBrandAudit = ({ brandProfile }: BrandAuditProps) =>
  tool({
    description: `Run a brand audit for ${brandProfile.brandName}. For auditType "commerce_readiness", uses the Knowsee Agentic Commerce Playbook. Call this when the user asks for a brand audit, agent-readiness audit, structured-data audit, or an assessment of how discoverable the brand is to AI agents. Returns the appropriate playbook or a generic fallback protocol; follow the returned instructions exactly, including any persona disambiguation question before starting research.`,
    inputSchema: z.object({
      auditType: z
        .enum(["commerce_readiness"])
        .describe("Type of brand audit to perform"),
      focusAreas: z
        .array(z.string())
        .optional()
        .describe(
          "Optional dimension or area names to prioritise (e.g. 'structured data', 'programmatic accessibility')"
        ),
    }),
    execute: ({ auditType, focusAreas }) => ({
      brandName: brandProfile.brandName,
      websiteUrl: brandProfile.websiteUrl,
      country: brandProfile.country,
      market: brandProfile.market ?? brandProfile.country,
      competitors: brandProfile.competitors as string[],
      retailers: brandProfile.retailers as string[],
      auditType,
      focusAreas: focusAreas ?? [],
      phases: PHASES_BY_TYPE[auditType] ?? GENERIC_PHASES,
      instructions: INSTRUCTIONS_BY_TYPE[auditType] ?? genericAuditInstructions,
    }),
  });
