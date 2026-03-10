import remarkParse from "remark-parse";
import { unified } from "unified";

// ---------------------------------------------------------------------------
// Markdown → AST parser — shared by DOCX and PDF converters
// ---------------------------------------------------------------------------

const parser = unified().use(remarkParse);

export function parseMarkdown(markdown: string) {
  return parser.parse(markdown);
}

export type { Content, PhrasingContent } from "mdast";
