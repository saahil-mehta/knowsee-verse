import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * HMAC-signed short tokens that authorise headless browser access to
 * `/print/[documentId]`. Auth lives in the export API route; this token lets
 * Puppeteer navigate to the internal print URL without dealing with session
 * cookies. The secret is the existing BETTER_AUTH_SECRET, which every
 * deployment already has.
 */

function getSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is required for print token signing");
  }
  return secret;
}

export function signPrintToken(documentId: string): string {
  return createHmac("sha256", getSecret()).update(documentId).digest("hex");
}

export function verifyPrintToken(
  documentId: string,
  token: string | undefined
): boolean {
  if (!token) {
    return false;
  }
  const expected = signPrintToken(documentId);
  if (token.length !== expected.length) {
    return false;
  }
  try {
    return timingSafeEqual(
      Buffer.from(token, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}
