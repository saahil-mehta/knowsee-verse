import { anthropic } from "@ai-sdk/anthropic";
import { gateway } from "@ai-sdk/gateway";
import { generateText, stepCountIs } from "ai";
import { z } from "zod";
import { getOwnedProject } from "@/lib/api/project-auth";
import { ChatSDKError } from "@/lib/errors";

export const maxDuration = 60;

const enrichmentSchema = z.object({
  country: z.string().max(64).default(""),
  market: z.string().max(64).default(""),
  categories: z.array(z.string().max(100)).max(20).default([]),
  competitors: z.array(z.string().max(100)).max(20).default([]),
  retailers: z.array(z.string().max(100)).max(20).default([]),
});

/**
 * Extract a 2-letter market code from the URL's TLD or path.
 * e.g. samsung.com/uk → GB, nike.co.uk → GB, amazon.de → DE
 */
const TLD_TO_MARKET: Record<string, string> = {
  uk: "GB",
  au: "AU",
  br: "BR",
  ca: "CA",
  cn: "CN",
  de: "DE",
  es: "ES",
  fr: "FR",
  in: "IN",
  it: "IT",
  jp: "JP",
  kr: "KR",
  mx: "MX",
  nl: "NL",
  ru: "RU",
  sa: "SA",
  se: "SE",
  sg: "SG",
  za: "ZA",
  us: "US",
};

function extractMarketFromUrl(websiteUrl: string): string {
  try {
    const url = new URL(websiteUrl);
    // Check path first: samsung.com/uk → "uk"
    const pathSegment = url.pathname.split("/")[1]?.toLowerCase();
    if (pathSegment && TLD_TO_MARKET[pathSegment]) {
      return TLD_TO_MARKET[pathSegment];
    }
    // Check ccTLD: nike.co.uk → "uk", amazon.de → "de"
    const parts = url.hostname.split(".");
    const tld = parts.at(-1)?.toLowerCase() ?? "";
    if (tld !== "com" && tld !== "org" && tld !== "net" && TLD_TO_MARKET[tld]) {
      return TLD_TO_MARKET[tld];
    }
    return "";
  } catch {
    return "";
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getOwnedProject(id);

  if ("error" in result) {
    return result.error;
  }

  try {
    const { brandName, websiteUrl } = await request.json();

    if (!brandName || !websiteUrl) {
      return new ChatSDKError("bad_request:project").toResponse();
    }

    let hostname: string;
    try {
      hostname = new URL(websiteUrl).hostname;
    } catch {
      return new ChatSDKError("bad_request:project").toResponse();
    }

    const logoUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
    const marketHint = extractMarketFromUrl(websiteUrl);

    const { text } = await generateText({
      model: gateway("anthropic/claude-haiku-4-5"),
      tools: {
        web_fetch: anthropic.tools.webFetch_20250910({
          maxUses: 1,
          maxContentTokens: 15_000,
        }),
        web_search: anthropic.tools.webSearch_20250305({ maxUses: 1 }),
      },
      stopWhen: stepCountIs(4),
      prompt: `You are researching the brand "${brandName}" (website: ${websiteUrl}).

1. First, fetch the website at ${websiteUrl} to understand what the brand does, their product categories, and their market.
2. Then search the web for "${brandName} competitors" and "${brandName} retailers stockists" to find their competitive landscape and retail partners.
3. Finally, return a JSON object with:
   - "country": the brand's country of origin as a 2-letter ISO code (e.g. "KR" for Samsung, "US" for Apple)
   - "market": the regional market this website serves as a 2-letter ISO code (e.g. "GB" for samsung.com/uk, "IN" for samsung.com/in)${marketHint ? ` — the URL suggests market "${marketHint}"` : ""}
   - "categories": array of product/service categories (e.g. ["Athletic Footwear", "Sportswear"])
   - "competitors": array of direct competitor brand names in this market (e.g. ["Adidas", "Puma"])
   - "retailers": array of major retailers/stockists that carry this brand in this market (e.g. ["Amazon", "Foot Locker"])

Return ONLY the JSON object, no other text. Example:
{"country": "KR", "market": "GB", "categories": ["Smartphones"], "competitors": ["Apple"], "retailers": ["Amazon UK"]}

If you cannot determine a field, use an empty array or empty string.`,
    });

    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      return Response.json({
        logoUrl,
        country: "",
        market: marketHint,
        categories: [],
        competitors: [],
        retailers: [],
      });
    }

    const parsed = enrichmentSchema.safeParse(JSON.parse(match[0]));

    if (!parsed.success) {
      return Response.json({
        logoUrl,
        country: "",
        market: marketHint,
        categories: [],
        competitors: [],
        retailers: [],
      });
    }

    return Response.json({ logoUrl, ...parsed.data });
  } catch (_error) {
    return new ChatSDKError("bad_request:project").toResponse();
  }
}
