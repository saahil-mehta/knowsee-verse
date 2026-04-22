import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { stripEmDashes } from "@/lib/text/sanitise-report";

// ---------------------------------------------------------------------------
// Markdown → AST parser — shared by DOCX and PDF converters.
// Includes remark-gfm for tables, strikethrough, and autolinks.
//
// Em-dashes are stripped before parsing so they never enter the AST, which
// covers any export path that bypasses the report tool's sanitiser (plain
// text artifacts, chat transcript export).
// ---------------------------------------------------------------------------

const parser = unified().use(remarkParse).use(remarkGfm);

export function parseMarkdown(markdown: string) {
  return parser.parse(stripEmDashes(markdown));
}

export type { Content, PhrasingContent } from "mdast";
