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

async function findExecutable(): Promise<string | null> {
  // The container image (Cloud Run) installs system Chromium and sets this;
  // locally it points at an installed Chrome, or we probe known paths.
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
 * Launch a headless browser using the system Chromium.
 *
 * Selected via PUPPETEER_EXECUTABLE_PATH (set in the Cloud Run image) or, in
 * local dev, the first Chrome/Chromium we can find. The serverless bundled
 * Chromium (`@sparticuz/chromium`) was retired with Vercel hosting.
 */
export async function launchBrowser(): Promise<Browser> {
  const executablePath = await findExecutable();
  if (!executablePath) {
    throw new Error(
      "No Chrome/Chromium found. Install Google Chrome or set PUPPETEER_EXECUTABLE_PATH."
    );
  }
  return puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}
