import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import type { Session } from "@/lib/auth";
import type { BrandProfile } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";

type BrandAuditProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  brandProfile: BrandProfile;
};

function generateResearchPlan(
  bp: BrandProfile,
  _auditType: string,
  focusAreas?: string[]
) {
  const brandName = bp.brandName;
  const websiteUrl = bp.websiteUrl;
  const competitors = bp.competitors as string[];

  const phases = [
    {
      name: "Structured Data Analysis",
      description: `Analyse ${websiteUrl} for schema.org markup, JSON-LD, Open Graph tags, and machine-readable product data.`,
      searchQueries: [
        `${brandName} site structured data schema.org`,
        `${websiteUrl} open graph meta tags`,
      ],
      fetchTargets: [websiteUrl],
      evaluationCriteria: [
        "Presence of Product, Organization, and BreadcrumbList schema",
        "Complete Open Graph and Twitter Card tags",
        "JSON-LD implementation quality",
      ],
    },
    {
      name: "Product Page Evaluation",
      description: `Evaluate ${brandName}'s product detail pages for agentic commerce readiness — pricing clarity, variant handling, API discoverability.`,
      searchQueries: [
        `${brandName} product page UX review`,
        `${brandName} API developer documentation`,
      ],
      fetchTargets: [`${websiteUrl}/products`, `${websiteUrl}/sitemap.xml`],
      evaluationCriteria: [
        "Clear, machine-parseable pricing",
        "Variant/SKU structure",
        "Add-to-cart API or programmatic interaction capability",
      ],
    },
    {
      name: "Checkout & Cart Analysis",
      description: `Assess ${brandName}'s checkout flow for programmatic interaction potential — guest checkout, cart APIs, payment flexibility.`,
      searchQueries: [
        `${brandName} checkout experience review`,
        `${brandName} guest checkout API`,
      ],
      fetchTargets: [],
      evaluationCriteria: [
        "Guest checkout availability",
        "Cart API or headless commerce indicators",
        "Payment method breadth",
      ],
    },
    {
      name: "Mobile UX & Search Quality",
      description: `Evaluate ${brandName}'s mobile experience, site search quality, and page performance.`,
      searchQueries: [
        `${brandName} mobile UX PageSpeed`,
        `${brandName} site search quality`,
      ],
      fetchTargets: [],
      evaluationCriteria: [
        "Mobile-responsive design quality",
        "Site search accuracy and autocomplete",
        "Core Web Vitals performance",
      ],
    },
    {
      name: "Competitive Comparison",
      description: `Compare ${brandName} against ${competitors.slice(0, 3).join(", ")} on the same agentic commerce dimensions.`,
      searchQueries: competitors
        .slice(0, 3)
        .map((c) => `${c} ecommerce structured data API`),
      fetchTargets: [],
      evaluationCriteria: [
        "Relative structured data maturity",
        "API availability comparison",
        "Feature parity assessment",
      ],
    },
    {
      name: "Findings Compilation",
      description: `Synthesise all research into a scored assessment with severity-graded recommendations for ${brandName}.`,
      searchQueries: [],
      fetchTargets: [],
      evaluationCriteria: [
        "Overall score out of 100",
        "Category scores out of 10",
        "Recommendations grouped by severity (CRITICAL/HIGH/MEDIUM/LOW)",
      ],
    },
  ];

  // Filter to focus areas if specified
  const filteredPhases = focusAreas?.length
    ? phases.filter(
        (p) =>
          focusAreas.some((area) =>
            p.name.toLowerCase().includes(area.toLowerCase())
          ) || p.name === "Findings Compilation"
      )
    : phases;

  return {
    brandName,
    auditType: "commerce_readiness",
    phases: filteredPhases,
    outputFormat: `Present results as structured markdown:
1. **Executive Summary** — 2-3 sentence overview with overall score (/100)
2. **Category Scores** — each dimension scored /10 with brief justification
3. **Detailed Findings** — per-phase analysis with evidence
4. **Recommendations** — grouped by severity:
   - CRITICAL: Blocking issues for agentic commerce
   - HIGH: Significant gaps reducing effectiveness
   - MEDIUM: Improvements for competitive advantage
   - LOW: Nice-to-have enhancements
5. **Competitive Position** — how ${brandName} ranks vs competitors`,
  };
}

export const createBrandAudit = ({ brandProfile }: BrandAuditProps) =>
  tool({
    description: `Generate a structured research plan for analysing ${brandProfile.brandName}'s agentic commerce readiness. Returns a multi-phase plan. After receiving the plan, execute each phase sequentially using web_search and web_fetch, then compile findings into a structured markdown assessment with scores and recommendations.`,
    inputSchema: z.object({
      auditType: z
        .enum(["commerce_readiness"])
        .describe("Type of brand audit to perform"),
      focusAreas: z
        .array(z.string())
        .optional()
        .describe("Optional specific areas to prioritise"),
    }),
    execute: ({ auditType, focusAreas }) => {
      return generateResearchPlan(brandProfile, auditType, focusAreas);
    },
  });
