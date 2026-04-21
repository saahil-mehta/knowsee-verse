import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Geo } from "@vercel/functions";
import type { ArtifactKind } from "@/components/artifact";
import { PROBE_MODELS } from "@/lib/ai/perception/models";
import type { BrandProfile } from "@/lib/db/schema";

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
const toolsTemplate = loadInstruction("tools.md");
const codeTemplate = loadInstruction("code.md");
const sheetTemplate = loadInstruction("sheet.md");
const titleTemplate = loadInstruction("title.md");
const summaryTemplate = loadInstruction("summary.md");
const brandModeTemplate = loadInstruction("brand-mode.md");
const brandMemoryTemplate = loadInstruction("brand-memory.md");
const updateDocumentTemplate = loadInstruction("update-document.md");
const commerceAuditPromptTemplate = loadInstruction("commerce-audit-prompt.md");
const agenticCommercePlaybookTemplate = loadInstruction(
  "agentic-commerce-playbook.md"
);
const genericAuditPromptTemplate = loadInstruction("generic-audit-prompt.md");

// Model-specific guidance — keyed by model ID suffix for easy lookup.
// Convention: model-<family>-<version>.md
const modelGuidanceFiles: Record<string, string> = {
  "anthropic/claude-haiku-4-5": loadInstruction("model-haiku-4-5.md"),
  "anthropic/claude-sonnet-4-6": loadInstruction("model-sonnet-4-6.md"),
  "anthropic/claude-opus-4-6": loadInstruction("model-opus-4-6.md"),
};

// ---------------------------------------------------------------------------
// ISO-3166-1 alpha-2 → full country name for prompt readability.
// Uses the Intl API so every valid ISO code resolves without maintenance.
// ---------------------------------------------------------------------------

const countryDisplayNames = new Intl.DisplayNames(["en"], { type: "region" });

function resolveCountryName(isoCode: string): string {
  try {
    return countryDisplayNames.of(isoCode.toUpperCase()) ?? isoCode;
  } catch {
    return isoCode;
  }
}

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

/** Strategic tool usage guidance. */
export const toolsPrompt = toolsTemplate;

/** Guidelines for artifact creation/update tools. */
export const artifactsPrompt = artifactsTemplate;

/** Combined commerce-audit mode + playbook. Returned by the brand_audit tool
 * so the model sees both the protocol and the rubric when running an audit. */
export const commerceAuditInstructions = `${commerceAuditPromptTemplate}\n\n${agenticCommercePlaybookTemplate}`;

/** Generic audit protocol. Returned by the brand_audit tool as a fallback
 * when the requested auditType has no specific playbook. */
export const genericAuditInstructions = genericAuditPromptTemplate;

/** Python code-generation system prompt. */
export const codePrompt = codeTemplate;

/** Spreadsheet creation system prompt. */
export const sheetPrompt = sheetTemplate;

/** Chat title generation system prompt. */
export const titlePrompt = titleTemplate;

/** Conversation summary prompt for branch-and-continue. */
export function summaryPrompt(focusPrompt?: string): string {
  return injectContext(summaryTemplate, {
    focus: focusPrompt ? `The user wants to focus on: ${focusPrompt}` : "",
  });
}

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

function brandContextPrompt(bp: BrandProfile): string {
  const mode = injectContext(brandModeTemplate, {
    brand_name: bp.brandName,
    website_url: bp.websiteUrl,
    country: resolveCountryName(bp.country),
    market: resolveCountryName(bp.market ?? bp.country),
    categories: (bp.categories as string[]).join(", "),
    competitors: (bp.competitors as string[]).join(", "),
    retailers: (bp.retailers as string[]).join(", "),
    probe_models: PROBE_MODELS.map((m) => m.label).join(", "),
  });
  return `${mode}\n\n${brandMemoryTemplate}`;
}

export const systemPrompt = ({
  selectedChatModel,
  requestHints,
  brandProfile,
}: {
  selectedChatModel: string;
  requestHints: RequestHints;
  brandProfile?: BrandProfile;
}) => {
  const requestPrompt = getRequestPromptFromHints(requestHints);
  const guidance = modelGuidanceFiles[selectedChatModel] ?? "";
  const brand = brandProfile ? `\n\n${brandContextPrompt(brandProfile)}` : "";
  return `${regularPrompt}\n\n${requestPrompt}\n\n${toolsPrompt}\n\n${artifactsPrompt}${guidance ? `\n\n${guidance}` : ""}${brand}`;
};

// ---------------------------------------------------------------------------
// Document-update prompt (dynamic — takes current content and artifact kind)
// ---------------------------------------------------------------------------

export const updateDocumentPrompt = (
  currentContent: string | null,
  type: ArtifactKind
) => {
  const mediaTypeMap: Record<string, string> = {
    code: "code snippet",
    sheet: "spreadsheet",
  };
  const mediaType = mediaTypeMap[type] ?? "document";

  return injectContext(updateDocumentTemplate, {
    media_type: mediaType,
    current_content: currentContent ?? "",
  });
};
