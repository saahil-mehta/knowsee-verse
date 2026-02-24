import { z } from "zod";

// ---------------------------------------------------------------------------
// Product Data — extracted from individual product pages via Stagehand
// ---------------------------------------------------------------------------

export const productDataSchema = z.object({
  name: z.string().describe("Product name"),
  price: z.number().describe("Product price as a number"),
  currency: z.string().default("GBP").describe("ISO 4217 currency code"),
  rating: z
    .number()
    .min(0)
    .max(5)
    .optional()
    .describe("Average star rating 0–5"),
  reviewCount: z.number().optional().describe("Number of customer reviews"),
  availability: z
    .enum(["in-stock", "low-stock", "out-of-stock", "unknown"])
    .describe("Stock availability status"),
  imageUrl: z.string().url().optional().describe("Product image URL"),
  sourceUrl: z.string().url().describe("URL the data was extracted from"),
  retailer: z.string().describe("Retailer or marketplace name"),
  features: z
    .array(z.string())
    .default([])
    .describe("Key product features or bullet points"),
});

export type ProductData = z.infer<typeof productDataSchema>;

// ---------------------------------------------------------------------------
// Browsing Step — snapshot of a single page visit during research
// ---------------------------------------------------------------------------

export const browsingStepDataSchema = z.object({
  url: z.string().url().describe("Page URL visited"),
  siteName: z.string().describe("Human-readable site name"),
  favicon: z.string().optional().describe("Favicon URL for the site"),
  screenshot: z
    .string()
    .optional()
    .describe("Base64 data URI of page screenshot"),
  description: z
    .string()
    .describe("Brief description of what was observed on the page"),
  productsFound: z
    .number()
    .default(0)
    .describe("Number of relevant products identified"),
});

export type BrowsingStepData = z.infer<typeof browsingStepDataSchema>;

// ---------------------------------------------------------------------------
// Comparison Result — side-by-side product comparison
// ---------------------------------------------------------------------------

export const comparisonDimensionSchema = z.object({
  name: z.string().describe("Comparison dimension (e.g. Price, Rating)"),
  values: z
    .array(z.string())
    .describe("One value per product, in the same order as the products array"),
  winnerId: z
    .number()
    .optional()
    .describe("Index of the winning product for this dimension"),
});

export const comparisonResultSchema = z.object({
  type: z.literal("comparison"),
  products: z.array(productDataSchema).describe("Products being compared"),
  dimensions: z
    .array(comparisonDimensionSchema)
    .describe("Comparison dimensions with per-product values"),
  winner: z
    .object({
      index: z.number().describe("Index of the recommended product"),
      name: z.string().describe("Name of the recommended product"),
      reasoning: z.string().describe("Why this product is recommended"),
    })
    .describe("Overall recommendation"),
  savingsEstimate: z
    .string()
    .optional()
    .describe("Estimated savings vs next-best option"),
});

export type ComparisonResult = z.infer<typeof comparisonResultSchema>;

// ---------------------------------------------------------------------------
// Audit Result — commerce readiness scorecard for a brand
// ---------------------------------------------------------------------------

export const auditCategorySchema = z.object({
  name: z.string().describe("Audit category name"),
  score: z.number().min(0).max(100).describe("Score out of 100"),
  findings: z
    .array(z.string())
    .describe("Key findings and observations for this category"),
});

export const auditResultSchema = z.object({
  type: z.literal("audit"),
  overallScore: z.number().min(0).max(100).describe("Overall readiness score"),
  categories: z
    .array(auditCategorySchema)
    .describe("Scored categories with findings"),
  recommendations: z
    .array(z.string())
    .describe("Actionable recommendations for improvement"),
});

export type AuditResult = z.infer<typeof auditResultSchema>;

// ---------------------------------------------------------------------------
// Union type for analyse_commerce tool output
// ---------------------------------------------------------------------------

export type AnalyseCommerceResult = ComparisonResult | AuditResult;
