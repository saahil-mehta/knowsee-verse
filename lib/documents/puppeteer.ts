import chromium from "@sparticuz/chromium";
import type { Browser } from "puppeteer-core";
import puppeteer from "puppeteer-core";

// Common local Chrome/Chromium paths for dev use.
const LOCAL_CHROME_PATHS: Partial<Record<NodeJS.Platform, string[]>> = {
  darwin: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  ],
  linux: [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ],
  win32: [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ],
};

async function findLocalExecutable(): Promise<string | null> {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const { existsSync } = await import("node:fs");
  const candidates = LOCAL_CHROME_PATHS[process.platform] ?? [];
  for (const path of candidates) {
    if (existsSync(path)) {
      return path;
    }
  }
  return null;
}

/**
 * Launch a headless browser suitable for the current environment.
 *
 * On Vercel / AWS Lambda, uses `@sparticuz/chromium`'s bundled Chromium.
 * Locally, uses the first system Chrome/Chromium we can find (or whatever
 * PUPPETEER_EXECUTABLE_PATH is set to).
 */
export async function launchBrowser(): Promise<Browser> {
  const isServerless = Boolean(
    process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME
  );

  if (isServerless) {
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const localPath = await findLocalExecutable();
  if (!localPath) {
    throw new Error(
      "No Chrome/Chromium found for local development. Install Google Chrome or set PUPPETEER_EXECUTABLE_PATH."
    );
  }
  return puppeteer.launch({
    executablePath: localPath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}
