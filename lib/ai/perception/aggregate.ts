import type { BrandProfile } from "@/lib/db/schema";
import type {
  AuditSummary,
  CategorySummary,
  ExtractionResult,
  ModelSummary,
  ProbeModelConfig,
  ProbePrompt,
} from "./types";

/**
 * Aggregate extraction results into a structured audit summary.
 * Pure function — no API calls.
 */
export function aggregateResults(
  extractions: ExtractionResult[],
  prompts: ProbePrompt[],
  models: ProbeModelConfig[],
  bp: BrandProfile,
  durationMs: number
): AuditSummary {
  const brandName = bp.brandName;

  // Group by model
  const byModel = new Map<string, ExtractionResult[]>();
  for (const e of extractions) {
    const arr = byModel.get(e.modelId) ?? [];
    arr.push(e);
    byModel.set(e.modelId, arr);
  }

  const modelResults: ModelSummary[] = models.map((model) => {
    const results = byModel.get(model.id) ?? [];
    const mentioned = results.filter((r) => r.mentioned);
    const withPosition = results.filter((r) => r.position !== null);

    return {
      modelId: model.id,
      modelLabel: model.label,
      mentionRate:
        results.length > 0 ? (mentioned.length / results.length) * 100 : 0,
      avgPosition:
        withPosition.length > 0
          ? withPosition.reduce((sum, r) => sum + (r.position ?? 0), 0) /
            withPosition.length
          : null,
      avgSentiment:
        results.length > 0
          ? results.reduce((sum, r) => sum + r.sentiment, 0) / results.length
          : 0,
      avgRecommendation:
        results.length > 0
          ? results.reduce((sum, r) => sum + r.recommendationStrength, 0) /
            results.length
          : 0,
      promptCount: results.length,
    };
  });

  // Group by category
  const promptMap = new Map(prompts.map((p) => [p.id, p]));
  const byCategory = new Map<string, ExtractionResult[]>();
  for (const e of extractions) {
    const prompt = promptMap.get(e.promptId);
    if (!prompt) {
      continue;
    }
    const arr = byCategory.get(prompt.category) ?? [];
    arr.push(e);
    byCategory.set(prompt.category, arr);
  }

  const categoryResults: CategorySummary[] = Array.from(
    byCategory.entries()
  ).map(([category, results]) => {
    const scores: Record<string, number> = {};

    // Brand score: mention rate in this category
    const brandMentioned = results.filter((r) => r.mentioned);
    scores[brandName] =
      results.length > 0 ? (brandMentioned.length / results.length) * 100 : 0;

    // Competitor scores: how often each competitor is mentioned
    const competitorCounts = new Map<string, number>();
    for (const r of results) {
      for (const c of r.competitorsMentioned) {
        competitorCounts.set(c, (competitorCounts.get(c) ?? 0) + 1);
      }
    }
    for (const [name, cnt] of competitorCounts) {
      scores[name] = (cnt / results.length) * 100;
    }

    return { category, scores };
  });

  // Aggregate competitor mentions
  const competitorMentions: Record<string, number> = {};
  for (const e of extractions) {
    for (const c of e.competitorsMentioned) {
      competitorMentions[c] = (competitorMentions[c] ?? 0) + 1;
    }
  }

  // Overall score: mentionRate * 0.4 + normalisedSentiment * 0.3 + normalisedRecommendation * 0.3
  const avgMentionRate =
    modelResults.length > 0
      ? modelResults.reduce((sum, m) => sum + m.mentionRate, 0) /
        modelResults.length
      : 0;
  const avgSentiment =
    extractions.length > 0
      ? extractions.reduce((sum, e) => sum + e.sentiment, 0) /
        extractions.length
      : 0;
  const avgRecommendation =
    extractions.length > 0
      ? extractions.reduce((sum, e) => sum + e.recommendationStrength, 0) /
        extractions.length
      : 0;

  // Normalise 1-5 to 0-100
  const normSentiment = ((avgSentiment - 1) / 4) * 100;
  const normRecommendation = ((avgRecommendation - 1) / 4) * 100;

  const overallScore = Math.round(
    avgMentionRate * 0.4 + normSentiment * 0.3 + normRecommendation * 0.3
  );

  return {
    overallScore,
    modelResults,
    categoryResults,
    competitorMentions,
    promptCount: prompts.length,
    modelsQueried: models.map((m) => m.label),
    durationMs,
  };
}

/**
 * Format the audit summary into a dense ~500-token text for Claude
 * to synthesise into a report artifact.
 */
export function formatSummaryForClaude(
  summary: AuditSummary,
  brandName: string
): string {
  const lines: string[] = [];

  lines.push(`## AI Visibility Audit Results for ${brandName}`);
  lines.push("");
  lines.push(`**Overall Visibility Score: ${summary.overallScore}/100**`);
  lines.push(
    `Probed ${summary.modelsQueried.length} AI models with ${summary.promptCount} prompts in ${(summary.durationMs / 1000).toFixed(1)}s.`
  );
  lines.push("");

  // Per-model breakdown
  lines.push("### Model Breakdown");
  for (const m of summary.modelResults) {
    const posStr =
      m.avgPosition === null
        ? ""
        : `, avg position: ${m.avgPosition.toFixed(1)}`;
    lines.push(
      `- **${m.modelLabel}**: mention rate ${m.mentionRate.toFixed(0)}%, sentiment ${m.avgSentiment.toFixed(1)}/5, recommendation ${m.avgRecommendation.toFixed(1)}/5${posStr}`
    );
  }
  lines.push("");

  // Category highlights
  lines.push("### Category Ownership");
  for (const c of summary.categoryResults) {
    const entries = Object.entries(c.scores)
      .sort(([, a], [, b]) => b - a)
      .map(([name, score]) => `${name}: ${score.toFixed(0)}%`)
      .join(", ");
    lines.push(`- **${c.category}**: ${entries}`);
  }
  lines.push("");

  // Top competitors
  const topCompetitors = Object.entries(summary.competitorMentions)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  if (topCompetitors.length > 0) {
    lines.push("### Top Competitor Mentions");
    for (const [name, count] of topCompetitors) {
      lines.push(`- ${name}: ${count} mentions`);
    }
    lines.push("");
  }

  // Raw data for report generation
  lines.push("### Raw Data (for report generation)");
  lines.push("```json");
  lines.push(JSON.stringify(summary, null, 2));
  lines.push("```");

  return lines.join("\n");
}
