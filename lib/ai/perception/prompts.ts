import type { BrandProfile } from "@/lib/db/schema";
import type { ProbePrompt } from "./types";

/**
 * Generates a deterministic set of probe prompts from a brand profile.
 * Returns 16-20 prompts across 4 categories, capped at 5 categories.
 */
export function generateProbePrompts(
  bp: BrandProfile,
  focusCategories?: string[]
): ProbePrompt[] {
  const categories = focusCategories?.length
    ? focusCategories.slice(0, 5)
    : (bp.categories as string[]).slice(0, 5);
  const competitors = bp.competitors as string[];
  const market = bp.market ?? "Global";
  const brand = bp.brandName;

  const prompts: ProbePrompt[] = [];

  // Category discovery — one per category
  for (let i = 0; i < categories.length; i++) {
    prompts.push({
      id: `category-discovery-${i}`,
      category: "category-discovery",
      text: `What are the best ${categories[i]} brands in ${market}?`,
    });
  }

  // Brand comparison — round-robin competitors across categories
  for (let i = 0; i < categories.length; i++) {
    const competitor = competitors[i % competitors.length];
    if (competitor) {
      prompts.push({
        id: `brand-comparison-${i}`,
        category: "brand-comparison",
        text: `Compare ${brand} vs ${competitor} for ${categories[i]}`,
      });
    }
  }

  // Recommendation — one per category
  for (let i = 0; i < categories.length; i++) {
    prompts.push({
      id: `recommendation-${i}`,
      category: "recommendation",
      text: `I need a good ${categories[i]}, what do you recommend in ${market}?`,
    });
  }

  // Purchase intent — one per category
  for (let i = 0; i < categories.length; i++) {
    prompts.push({
      id: `purchase-intent-${i}`,
      category: "purchase-intent",
      text: `Where can I buy ${categories[i]} online in ${market}?`,
    });
  }

  return prompts;
}
