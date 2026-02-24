import { anthropic } from "@ai-sdk/anthropic";
import type { RequestHints } from "@/lib/ai/instructions";

export function createServerTools(requestHints: RequestHints) {
  return {
    web_search: anthropic.tools.webSearch_20250305({
      maxUses: 5,
      userLocation: {
        type: "approximate" as const,
        country: requestHints.country ?? "US",
        city: requestHints.city ?? undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    }),
    web_fetch: anthropic.tools.webFetch_20250910({
      maxUses: 3,
      maxContentTokens: 25_000,
    }),
  };
}
