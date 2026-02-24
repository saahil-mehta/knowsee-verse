import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import type { Session } from "@/lib/auth";
import type { ChatMessage } from "@/lib/types";
import { createBrowserSession } from "../../commerce/stagehand";

type BrowseSiteProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

export const createBrowseSiteTool = ({
  session: _session,
  dataStream: _dataStream,
}: BrowseSiteProps) =>
  tool({
    description:
      "Browse a website to observe its content, take a screenshot, and identify products or key elements. Use this to visit retailer pages, brand homepages, or product listings during commerce research.",
    inputSchema: z.object({
      url: z.string().url().describe("The URL to navigate to"),
      objective: z
        .string()
        .describe(
          "What to look for on this page, e.g. 'find running shoe listings' or 'assess checkout flow'"
        ),
    }),
    execute: async ({ url, objective }) => {
      let stagehand:
        | Awaited<ReturnType<typeof createBrowserSession>>["stagehand"]
        | null = null;

      try {
        const session = await createBrowserSession();
        stagehand = session.stagehand;
        const { page } = session;

        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeoutMs: 15_000,
        });

        const screenshotBuffer = await page.screenshot({
          type: "jpeg",
          quality: 70,
        });
        const screenshot = `data:image/jpeg;base64,${Buffer.from(screenshotBuffer).toString("base64")}`;

        const observations = await stagehand.observe(objective);

        const title = await page.title();
        let hostname: string;
        try {
          hostname = new URL(url).hostname;
        } catch {
          hostname = url;
        }

        const siteName = title || hostname;
        const favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;

        const description =
          observations.length > 0
            ? observations
                .slice(0, 5)
                .map((o) => o.description)
                .join("; ")
            : `Visited ${siteName} — page loaded successfully.`;

        const productsFound = observations.filter(
          (o) =>
            o.description?.toLowerCase().includes("product") ||
            o.description?.toLowerCase().includes("price") ||
            o.description?.toLowerCase().includes("buy")
        ).length;

        return {
          url,
          siteName,
          favicon,
          screenshot,
          description,
          productsFound,
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown browsing error";
        console.error(`[browse_site] Failed for ${url}:`, message);
        return { error: message };
      } finally {
        if (stagehand) {
          await stagehand.close().catch(() => {
            // Ignore cleanup errors
          });
        }
      }
    },
  });
