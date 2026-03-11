import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Content, PhrasingContent } from "mdast";
import PDFDocument from "pdfkit";
import { BRAND } from "./brand";
import { parseMarkdown } from "./parse-markdown";

// Full wordmark logo (mark + "Knowsee" text) — cached at module level
let _logoFull: Buffer | null = null;
function getLogoFull(): Buffer | null {
  if (_logoFull) {
    return _logoFull;
  }
  try {
    _logoFull = readFileSync(
      join(process.cwd(), "public", "knowsee-logo-light.png")
    );
    return _logoFull;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Markdown → PDF converter — matches Knowsee brand style from md_to_docx.py
// ---------------------------------------------------------------------------

// Font sizes (tuned for PDF — slightly smaller than DOCX equivalents)
const HEADING_SIZES: Record<number, number> = {
  1: 18, // H1: section titles (DOCX=26pt → PDF=18pt)
  2: 14, // H2: subsections
  3: 11, // H3: sub-subsections
  4: 10, // H4: minor headings
};

const BODY_SIZE = 10;
const CODE_SIZE = 8.5;
const TABLE_FONT_SIZE = 9;
const HEADER_FONT_SIZE = 7.5;
const FOOTER_FONT_SIZE = 7.5;
const LINE_GAP = 3;
const BULLET_INDENT = 24;

// Derived layout constants
const CONTENT_WIDTH =
  BRAND.pageSize.width - BRAND.margin.left - BRAND.margin.right;
const FOOTER_Y = BRAND.pageSize.height - BRAND.margin.bottom + 20;
const HEADER_Y = BRAND.margin.top - 30;

type InlineSegment = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  mono?: boolean;
  link?: string;
  color?: string;
};

// ---------------------------------------------------------------------------
// Inline content → flat segment list
// ---------------------------------------------------------------------------

function phrasingToSegments(
  nodes: PhrasingContent[],
  opts: { bold?: boolean; italic?: boolean } = {}
): InlineSegment[] {
  const segments: InlineSegment[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case "text":
        segments.push({
          text: node.value,
          bold: opts.bold,
          italic: opts.italic,
        });
        break;

      case "strong":
        segments.push(
          ...phrasingToSegments(node.children, { ...opts, bold: true })
        );
        break;

      case "emphasis":
        segments.push(
          ...phrasingToSegments(node.children, { ...opts, italic: true })
        );
        break;

      case "inlineCode":
        segments.push({ text: node.value, mono: true });
        break;

      case "link": {
        const linkText =
          node.children.map((c) => ("value" in c ? c.value : "")).join("") ||
          node.url;
        segments.push({
          text: linkText,
          link: node.url,
          color: BRAND.purple,
        });
        break;
      }

      default:
        if ("value" in node && typeof node.value === "string") {
          segments.push({ text: node.value });
        }
        break;
    }
  }

  return segments;
}

// ---------------------------------------------------------------------------
// Flatten phrasing nodes to plain text (for table cells, headers)
// ---------------------------------------------------------------------------

function phrasingToText(nodes: PhrasingContent[]): string {
  return nodes
    .map((n) => {
      if ("value" in n && typeof n.value === "string") {
        return n.value;
      }
      if ("children" in n) {
        return phrasingToText(n.children as PhrasingContent[]);
      }
      return "";
    })
    .join("");
}

// ---------------------------------------------------------------------------
// Render segments to PDF (inline content with font switching)
// ---------------------------------------------------------------------------

function renderSegments(
  doc: InstanceType<typeof PDFDocument>,
  segments: InlineSegment[],
  opts: { fontSize?: number; indent?: number } = {}
) {
  const fontSize = opts.fontSize ?? BODY_SIZE;
  const indent = opts.indent ?? 0;

  if (indent > 0) {
    doc.x = BRAND.margin.left + indent;
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const isLast = i === segments.length - 1;

    let fontName = "Helvetica";
    let size = fontSize;

    if (seg.mono) {
      fontName = "Courier";
      size = Math.max(fontSize - 1, CODE_SIZE);
    } else if (seg.bold && seg.italic) {
      fontName = "Helvetica-BoldOblique";
    } else if (seg.bold) {
      fontName = "Helvetica-Bold";
    } else if (seg.italic) {
      fontName = "Helvetica-Oblique";
    }

    doc
      .font(fontName)
      .fontSize(size)
      .fillColor(seg.color ?? BRAND.darkGrey);

    if (seg.link) {
      doc.text(seg.text, {
        continued: !isLast,
        link: seg.link,
        underline: true,
        lineGap: LINE_GAP,
      });
    } else {
      doc.text(seg.text, {
        continued: !isLast,
        lineGap: LINE_GAP,
      });
    }
  }

  if (segments.length === 0) {
    doc.text("", { lineGap: LINE_GAP });
  }
}

// ---------------------------------------------------------------------------
// Check if we need a page break before content of given height
// ---------------------------------------------------------------------------

function ensureSpace(doc: InstanceType<typeof PDFDocument>, height: number) {
  if (doc.y + height > BRAND.pageSize.height - BRAND.margin.bottom - 20) {
    doc.addPage();
  }
}

// ---------------------------------------------------------------------------
// Block content → PDF operations
// ---------------------------------------------------------------------------

function renderBlock(
  doc: InstanceType<typeof PDFDocument>,
  node: Content,
  _ctx: { skipFirstH1?: boolean },
  listLevel = 0
): boolean {
  // Return true if we skipped a node (for the skipFirstH1 logic)
  switch (node.type) {
    case "heading": {
      const depth = Math.min(node.depth, 4);

      // Skip first H1 if title is already rendered
      if (depth === 1 && _ctx.skipFirstH1) {
        _ctx.skipFirstH1 = false;
        return true;
      }

      const size = HEADING_SIZES[depth] ?? BODY_SIZE;
      ensureSpace(doc, size + 20);

      // H1: purple accent rule above
      if (depth === 1) {
        doc.moveDown(1.2);
        doc
          .strokeColor(BRAND.purple)
          .lineWidth(1.5)
          .moveTo(BRAND.margin.left, doc.y)
          .lineTo(BRAND.margin.left + CONTENT_WIDTH, doc.y)
          .stroke();
        doc.moveDown(0.5);
      } else if (depth === 2) {
        doc.moveDown(0.8);
      } else {
        doc.moveDown(0.5);
      }

      const segments = phrasingToSegments(node.children);
      for (const seg of segments) {
        seg.bold = true;
        seg.color = depth === 1 || depth === 3 ? BRAND.purple : BRAND.darkGrey;
      }

      renderSegments(doc, segments, { fontSize: size });
      doc.moveDown(0.3);
      break;
    }

    case "paragraph": {
      const segments = phrasingToSegments(node.children);
      renderSegments(doc, segments);
      doc.moveDown(0.4);
      break;
    }

    case "list": {
      let counter = 0;
      for (const item of node.children) {
        counter++;
        for (const child of item.children) {
          if (child.type === "paragraph") {
            const indent = BULLET_INDENT * (listLevel + 1);
            const bullet = node.ordered ? `${counter}. ` : "\u2022  ";
            const segments = phrasingToSegments(child.children);
            segments.unshift({ text: bullet });
            renderSegments(doc, segments, { indent });
            doc.moveDown(0.15);
          } else if (child.type === "list") {
            renderBlock(doc, child, _ctx, listLevel + 1);
          } else {
            renderBlock(doc, child, _ctx, listLevel);
          }
        }
      }
      doc.moveDown(0.25);
      break;
    }

    case "code": {
      doc.moveDown(0.2);

      const codeX = doc.x;
      doc.font("Courier").fontSize(CODE_SIZE);
      const codeHeight = doc.heightOfString(node.value, {
        width: CONTENT_WIDTH - 16,
        lineGap: LINE_GAP,
      });

      ensureSpace(doc, codeHeight + 16);

      const rectY = doc.y;
      doc
        .rect(codeX, rectY, CONTENT_WIDTH, codeHeight + 16)
        .fill(BRAND.lightGrey);

      doc
        .font("Courier")
        .fontSize(CODE_SIZE)
        .fillColor(BRAND.darkGrey)
        .text(node.value, codeX + 8, rectY + 8, {
          width: CONTENT_WIDTH - 16,
          lineGap: LINE_GAP,
        });

      doc.moveDown(0.4);
      break;
    }

    case "blockquote": {
      const savedX = doc.x;
      const barX = doc.x;

      for (const child of node.children) {
        const barY = doc.y;
        // Purple left bar
        doc.rect(barX, barY, 2.5, 14).fill(BRAND.purple);

        doc.x = barX + 14;
        doc.fillColor(BRAND.darkGrey);

        if (child.type === "paragraph") {
          const segments = phrasingToSegments(child.children);
          for (const seg of segments) {
            seg.italic = true;
          }
          renderSegments(doc, segments);
        } else {
          renderBlock(doc, child, _ctx);
        }
      }

      doc.x = savedX;
      doc.moveDown(0.2);
      break;
    }

    case "thematicBreak": {
      doc.moveDown(0.4);
      doc
        .strokeColor(BRAND.purple)
        .lineWidth(0.75)
        .moveTo(BRAND.margin.left, doc.y)
        .lineTo(BRAND.margin.left + CONTENT_WIDTH, doc.y)
        .stroke();
      doc.moveDown(0.4);
      break;
    }

    case "table": {
      if (node.children.length === 0) {
        break;
      }

      doc.moveDown(0.3);
      const colCount = node.children[0]?.children.length ?? 1;
      const colWidth = CONTENT_WIDTH / colCount;
      const cellPad = 5;
      const rowHeight = 22;

      ensureSpace(doc, rowHeight * Math.min(node.children.length, 4));

      for (let rowIdx = 0; rowIdx < node.children.length; rowIdx++) {
        const row = node.children[rowIdx];
        const isHeader = rowIdx === 0;

        ensureSpace(doc, rowHeight);

        // Row background
        if (isHeader) {
          doc
            .rect(BRAND.margin.left, doc.y, CONTENT_WIDTH, rowHeight)
            .fill(BRAND.purple);
        } else if (rowIdx % 2 === 0) {
          doc
            .rect(BRAND.margin.left, doc.y, CONTENT_WIDTH, rowHeight)
            .fill("#F5F0FF");
        }

        // Render cells
        const cellY = doc.y;
        for (let colIdx = 0; colIdx < row.children.length; colIdx++) {
          const cell = row.children[colIdx];
          const cellX = BRAND.margin.left + colIdx * colWidth + cellPad;
          const text = phrasingToText(cell.children);

          doc
            .font(isHeader ? "Helvetica-Bold" : "Helvetica")
            .fontSize(TABLE_FONT_SIZE)
            .fillColor(isHeader ? BRAND.white : BRAND.darkGrey)
            .text(text, cellX, cellY + 5, {
              width: colWidth - cellPad * 2,
              lineBreak: false,
            });
        }

        doc.y = cellY + rowHeight;
      }

      // Reset X to left margin (cells leave it at last cell position)
      doc.x = BRAND.margin.left;
      doc.moveDown(0.4);
      break;
    }

    default:
      break;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Add header and footer to all buffered pages
// ---------------------------------------------------------------------------

function addHeaderFooter(doc: InstanceType<typeof PDFDocument>, title: string) {
  const range = doc.bufferedPageRange();
  const logo = getLogoFull();

  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i + range.start);

    // --- Header: Knowsee logo (left) + title (right) ---
    if (logo) {
      doc.image(logo, BRAND.margin.left, HEADER_Y - 2, { height: 14 });
    }

    doc
      .font("Helvetica")
      .fontSize(HEADER_FONT_SIZE)
      .fillColor("#999999")
      .text(title, BRAND.margin.left, HEADER_Y, {
        width: CONTENT_WIDTH,
        align: "right",
        lineBreak: false,
      });

    // Header bottom rule
    const headerRuleY = HEADER_Y + 14;
    doc
      .strokeColor(BRAND.purple)
      .lineWidth(0.5)
      .moveTo(BRAND.margin.left, headerRuleY)
      .lineTo(BRAND.margin.left + CONTENT_WIDTH, headerRuleY)
      .stroke();

    // --- Footer: "Knowsee | Page X" centred ---
    // Temporarily zero the bottom margin so PDFKit doesn't auto-paginate
    // when writing text below the content area.
    const savedBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    doc
      .font("Helvetica")
      .fontSize(FOOTER_FONT_SIZE)
      .fillColor("#999999")
      .text(`Knowsee  |  Page ${i + 1}`, BRAND.margin.left, FOOTER_Y, {
        width: CONTENT_WIDTH,
        align: "center",
        lineBreak: false,
      });

    doc.page.margins.bottom = savedBottom;

    // Reset cursor to content area
    doc.x = BRAND.margin.left;
    doc.y = BRAND.margin.top;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function markdownToPdf(
  markdown: string,
  title?: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: BRAND.margin.top,
        bottom: BRAND.margin.bottom,
        left: BRAND.margin.left,
        right: BRAND.margin.right,
      },
      info: {
        Title: title ?? "Document",
        Creator: "Knowsee",
      },
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const ast = parseMarkdown(markdown);

    // Render title from param as the document heading, then skip the
    // first H1 in the markdown to avoid duplication.
    const ctx = { skipFirstH1: !!title };

    if (title) {
      doc
        .font("Helvetica-Bold")
        .fontSize(HEADING_SIZES[1])
        .fillColor(BRAND.purple)
        .text(title, { lineGap: LINE_GAP });
      doc.moveDown(0.5);
    }

    for (const node of ast.children) {
      renderBlock(doc, node, ctx);
    }

    // Add headers and footers to all pages (using buffered pages)
    addHeaderFooter(doc, title ?? "Document");

    doc.end();
  });
}
