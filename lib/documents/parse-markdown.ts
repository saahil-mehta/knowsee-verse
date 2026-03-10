import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

// ---------------------------------------------------------------------------
// Markdown → AST parser — shared by DOCX and PDF converters.
// Includes remark-gfm for tables, strikethrough, and autolinks.
// ---------------------------------------------------------------------------

const parser = unified().use(remarkParse).use(remarkGfm);

export function parseMarkdown(markdown: string) {
  return parser.parse(markdown);
}

export type { Content, PhrasingContent } from "mdast";
