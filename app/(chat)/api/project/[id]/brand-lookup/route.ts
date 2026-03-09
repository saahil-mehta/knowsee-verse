import { anthropic } from "@ai-sdk/anthropic";
import { gateway } from "@ai-sdk/gateway";
import { generateText, stepCountIs } from "ai";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getProjectById } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export const maxDuration = 60;

const suggestionSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  description: z.string().optional(),
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
    const { query } = await request.json();

    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return Response.json({ suggestions: [] });
    }

    const { text } = await generateText({
      model: gateway("anthropic/claude-haiku-4-5"),
      tools: {
        web_search: anthropic.tools.webSearch_20250305({ maxUses: 2 }),
      },
      stopWhen: stepCountIs(3),
      prompt: `Search the web to find the official website for the brand "${query.trim()}". Include regional domain variants if they exist (e.g. nike.co.uk for UK, samsung.com/in for India).

Return a JSON array of brand suggestions. Each object must have:
- "name": the official brand name
- "url": the official website URL
- "description": a brief one-line description (optional)

Return ONLY the JSON array, no other text. Example format:
[{"name": "Nike", "url": "https://www.nike.com", "description": "Athletic footwear and apparel"}]

If you cannot find the brand, return an empty array: []`,
    });

    const match = text.match(/\[[\s\S]*\]/);

    if (!match) {
      return Response.json({ suggestions: [] });
    }

    const parsed = z.array(suggestionSchema).safeParse(JSON.parse(match[0]));

    if (!parsed.success) {
      return Response.json({ suggestions: [] });
    }

    return Response.json({ suggestions: parsed.data });
  } catch (_error) {
    return new ChatSDKError("bad_request:project").toResponse();
  }
}
