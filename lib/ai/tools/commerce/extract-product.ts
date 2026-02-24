import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import type { Session } from "@/lib/auth";
import type { ChatMessage } from "@/lib/types";
import { productDataSchema } from "../../commerce/schemas";
import { createBrowserSession } from "../../commerce/stagehand";

type ExtractProductProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

export const createExtractProductTool = ({
  session: _session,
  dataStream: _dataStream,
}: ExtractProductProps) =>
  tool({
    description:
      "Extract structured product data from a product page URL. Returns name, price, rating, availability, and other details in a consistent format for comparison.",
    inputSchema: z.object({
      url: z
        .string()
        .url()
        .describe("The product page URL to extract data from"),
      productHint: z
        .string()
        .optional()
        .describe(
          "Optional hint about the product name to help extraction accuracy"
        ),
    }),
    execute: async ({ url, productHint }) => {
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

        // Extract the retailer name from the hostname
        let retailer: string;
        try {
          const hostname = new URL(url).hostname;
          retailer = hostname.replace(/^www\./, "").split(".")[0];
          retailer = retailer.charAt(0).toUpperCase() + retailer.slice(1);
        } catch {
          retailer = "Unknown";
        }

        const instruction = productHint
          ? `Extract the product details for "${productHint}" from this page, including name, price, rating, review count, availability, image URL, and key features.`
          : "Extract the main product details from this page, including name, price, rating, review count, availability, image URL, and key features.";

        const extractionSchema = z.object({
          name: z.string().describe("Product name"),
          price: z.number().describe("Product price as a number"),
          currency: z
            .string()
            .default("GBP")
            .describe("ISO 4217 currency code"),
          rating: z
            .number()
            .min(0)
            .max(5)
            .optional()
            .describe("Average star rating 0–5"),
          reviewCount: z
            .number()
            .optional()
            .describe("Number of customer reviews"),
          availability: z
            .enum(["in-stock", "low-stock", "out-of-stock", "unknown"])
            .describe("Stock availability status"),
          imageUrl: z.string().optional().describe("Product image URL"),
          features: z
            .array(z.string())
            .default([])
            .describe("Key product features or bullet points"),
        });

        const extracted = await stagehand.extract(
          instruction,
          extractionSchema
        );

        const screenshotBuffer = await page.screenshot({
          type: "jpeg",
          quality: 70,
        });
        const screenshot = `data:image/jpeg;base64,${Buffer.from(screenshotBuffer).toString("base64")}`;

        const product = productDataSchema.parse({
          ...extracted,
          sourceUrl: url,
          retailer,
        });

        return {
          ...product,
          screenshot,
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown extraction error";
        console.error(`[extract_product] Failed for ${url}:`, message);
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
