import { AISdkClient, Stagehand } from "@browserbasehq/stagehand";
import { getLanguageModel } from "../providers";

/**
 * Creates a Stagehand browser session connected to Browserbase.
 *
 * Uses the Vercel AI Gateway for Stagehand's internal LLM calls,
 * so no additional API key is required beyond the gateway.
 *
 * Each invocation spins up a fresh remote browser — callers are
 * responsible for closing the session via `stagehand.close()`.
 */
export async function createBrowserSession() {
  const llmClient = new AISdkClient({
    model: getLanguageModel("google/gemini-2.0-flash"),
  });

  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    apiKey: process.env.BROWSERBASE_API_KEY,
    projectId: process.env.BROWSERBASE_PROJECT_ID,
    llmClient,
  });

  await stagehand.init();

  const page = stagehand.context.pages()[0];

  return { stagehand, page };
}
