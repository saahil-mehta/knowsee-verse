import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Geo } from "@vercel/functions";
import type { ArtifactKind } from "@/components/artifact";

// ---------------------------------------------------------------------------
// Markdown loader — reads instruction files relative to this directory.
// Files are loaded once at module initialisation and cached by Node's
// module system, so there is no per-request I/O overhead.
// ---------------------------------------------------------------------------

function loadInstruction(filename: string): string {
  return readFileSync(
    join(process.cwd(), "lib", "ai", "instructions", filename),
    "utf-8"
  ).trim();
}

// ---------------------------------------------------------------------------
// Template injection — replaces {{placeholder}} tokens in a template string.
// ---------------------------------------------------------------------------

function injectContext(
  template: string,
  vars: Record<string, string | undefined>
): string {
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, value ?? ""),
    template
  );
}

// ---------------------------------------------------------------------------
// Load instruction templates (cached at module level)
// ---------------------------------------------------------------------------

const identityTemplate = loadInstruction("identity.md");
const artifactsTemplate = loadInstruction("artifacts.md");
const codeTemplate = loadInstruction("code.md");
const sheetTemplate = loadInstruction("sheet.md");
const titleTemplate = loadInstruction("title.md");

// ---------------------------------------------------------------------------
// Exported prompt constants — drop-in replacements for the old prompts.ts
// ---------------------------------------------------------------------------

/** Knowsee identity, voice, safety, and formatting rules. */
export const regularPrompt = injectContext(identityTemplate, {
  current_date: new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
});

/** Guidelines for artifact creation/update tools. */
export const artifactsPrompt = artifactsTemplate;

/** Python code-generation system prompt. */
export const codePrompt = codeTemplate;

/** Spreadsheet creation system prompt. */
export const sheetPrompt = sheetTemplate;

/** Chat title generation system prompt. */
export const titlePrompt = titleTemplate;

// ---------------------------------------------------------------------------
// Geo-context helper
// ---------------------------------------------------------------------------

export type RequestHints = {
  latitude: Geo["latitude"];
  longitude: Geo["longitude"];
  city: Geo["city"];
  country: Geo["country"];
};

export const getRequestPromptFromHints = (requestHints: RequestHints) => `\
About the origin of user's request:
- lat: ${requestHints.latitude}
- lon: ${requestHints.longitude}
- city: ${requestHints.city}
- country: ${requestHints.country}
`;

// ---------------------------------------------------------------------------
// System prompt composer — the main entry point used by the chat route.
// ---------------------------------------------------------------------------

export const systemPrompt = ({
  selectedChatModel,
  requestHints,
}: {
  selectedChatModel: string;
  requestHints: RequestHints;
}) => {
  const requestPrompt = getRequestPromptFromHints(requestHints);

  // Reasoning models cannot invoke tools, so the artifacts prompt is omitted.
  if (
    selectedChatModel.includes("reasoning") ||
    selectedChatModel.includes("thinking")
  ) {
    return `${regularPrompt}\n\n${requestPrompt}`;
  }

  return `${regularPrompt}\n\n${requestPrompt}\n\n${artifactsPrompt}`;
};

// ---------------------------------------------------------------------------
// Document-update prompt (dynamic — takes current content and artifact kind)
// ---------------------------------------------------------------------------

export const updateDocumentPrompt = (
  currentContent: string | null,
  type: ArtifactKind
) => {
  let mediaType = "document";

  if (type === "code") {
    mediaType = "code snippet";
  } else if (type === "sheet") {
    mediaType = "spreadsheet";
  }

  return `Improve the following contents of the ${mediaType} based on the given prompt.\n\n${currentContent}`;
};
