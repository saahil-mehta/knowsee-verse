import { anthropic } from "@ai-sdk/anthropic";
import { gateway } from "@ai-sdk/gateway";
import { generateText, stepCountIs } from "ai";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getProjectById } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export const maxDuration = 60;

const enrichmentSchema = z.object({
  country: z.string().max(64).default(""),
  categories: z.array(z.string().max(100)).max(20).default([]),
  competitors: z.array(z.string().max(100)).max(20).default([]),
  retailers: z.array(z.string().max(100)).max(20).default([]),
});

async function getOwnedProject(id: string) {
  const session = await getSession();

  if (!session?.user) {
    return { error: new ChatSDKError("unauthorized:project").toResponse() };
  }

  const proj = await getProjectById({ id });

  if (!proj) {
    return { error: new ChatSDKError("not_found:project").toResponse() };
  }

  if (proj.userId !== session.user.id) {
    return { error: new ChatSDKError("forbidden:project").toResponse() };
  }

  return { project: proj };
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
   - "country": the brand's primary country of origin as a 2-letter ISO code (e.g. "US", "GB", "IN")
   - "categories": array of product/service categories (e.g. ["Athletic Footwear", "Sportswear"])
   - "competitors": array of direct competitor brand names (e.g. ["Adidas", "Puma"])
   - "retailers": array of major retailers/stockists that carry this brand (e.g. ["Amazon", "Foot Locker"])

Return ONLY the JSON object, no other text. Example:
{"country": "US", "categories": ["Athletic Footwear"], "competitors": ["Adidas"], "retailers": ["Amazon"]}

If you cannot determine a field, use an empty array or empty string.`,
    });

    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      return Response.json({
        logoUrl,
        country: "",
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
