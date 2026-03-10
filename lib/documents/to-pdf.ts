import type { Content, PhrasingContent } from "mdast";
import PDFDocument from "pdfkit";
import { BRAND } from "./brand";
import { parseMarkdown } from "./parse-markdown";

// ---------------------------------------------------------------------------
// Markdown → PDF converter using PDFKit
// ---------------------------------------------------------------------------

const HEADING_SIZES: Record<number, number> = {
  1: 22,
  2: 18,
  3: 15,
  4: 13,
};

const BODY_SIZE = 11;
const CODE_SIZE = 9;
const LINE_GAP = 4;

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
// Render segments to PDF (inline content on a single conceptual line)
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
      size = CODE_SIZE;
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

  // If no segments, ensure we still advance
  if (segments.length === 0) {
    doc.text("", { lineGap: LINE_GAP });
  }
}

// ---------------------------------------------------------------------------
// Block content → PDF operations
// ---------------------------------------------------------------------------

function renderBlock(
  doc: InstanceType<typeof PDFDocument>,
  node: Content,
  _listCounter: { ordered: number },
  listLevel = 0
) {
  switch (node.type) {
    case "heading": {
      const depth = Math.min(node.depth, 4);
      const size = HEADING_SIZES[depth] ?? BODY_SIZE;
      doc.moveDown(0.8);

      const segments = phrasingToSegments(node.children);
      for (const seg of segments) {
        seg.bold = true;
        seg.color = depth <= 2 ? BRAND.purple : BRAND.darkGrey;
      }

      renderSegments(doc, segments, { fontSize: size });
      doc.moveDown(0.3);
      break;
    }

    case "paragraph": {
      const segments = phrasingToSegments(node.children);
      renderSegments(doc, segments);
      doc.moveDown(0.5);
      break;
    }

    case "list": {
      const counter = { ordered: 0 };
      for (const item of node.children) {
        counter.ordered++;
        for (const child of item.children) {
          if (child.type === "paragraph") {
            const indent = 20 * (listLevel + 1);
            const bullet = node.ordered ? `${counter.ordered}. ` : "\u2022 ";
            const segments = phrasingToSegments(child.children);
            segments.unshift({ text: bullet });
            renderSegments(doc, segments, { indent });
            doc.moveDown(0.2);
          } else if (child.type === "list") {
            renderBlock(doc, child, { ordered: 0 }, listLevel + 1);
          } else {
            renderBlock(doc, child, counter, listLevel);
          }
        }
      }
      doc.moveDown(0.3);
      break;
    }

    case "code": {
      doc.moveDown(0.3);

      // Background rectangle for code block
      const codeX = doc.x;
      const codeWidth =
        BRAND.pageSize.width - BRAND.margin.left - BRAND.margin.right;

      // Measure height first (set font before measuring)
      doc.font("Courier").fontSize(CODE_SIZE);
      const codeHeight = doc.heightOfString(node.value, {
        width: codeWidth - 16,
        lineGap: LINE_GAP,
      });

      // Check for page break
      if (
        doc.y + codeHeight + 16 >
        BRAND.pageSize.height - BRAND.margin.bottom
      ) {
        doc.addPage();
      }

      const rectY = doc.y;
      doc.rect(codeX, rectY, codeWidth, codeHeight + 16).fill(BRAND.lightGrey);

      doc
        .font("Courier")
        .fontSize(CODE_SIZE)
        .fillColor(BRAND.darkGrey)
        .text(node.value, codeX + 8, rectY + 8, {
          width: codeWidth - 16,
          lineGap: LINE_GAP,
        });

      doc.moveDown(0.5);
      break;
    }

    case "blockquote": {
      const savedX = doc.x;
      const barX = doc.x;
      doc.x = barX + 16;

      for (const child of node.children) {
        // Draw left bar
        const barY = doc.y;
        doc.rect(barX, barY, 3, 14).fill(BRAND.purple);

        doc.fillColor(BRAND.darkGrey);
        renderBlock(doc, child, { ordered: 0 });
      }

      doc.x = savedX;
      break;
    }

    case "thematicBreak": {
      doc.moveDown(0.5);
      const ruleWidth =
        BRAND.pageSize.width - BRAND.margin.left - BRAND.margin.right;
      doc
        .strokeColor("#cccccc")
        .lineWidth(0.5)
        .moveTo(doc.x, doc.y)
        .lineTo(doc.x + ruleWidth, doc.y)
        .stroke();
      doc.moveDown(0.5);
      break;
    }

    case "table": {
      if (node.children.length === 0) {
        break;
      }

      doc.moveDown(0.3);
      const tableWidth =
        BRAND.pageSize.width - BRAND.margin.left - BRAND.margin.right;
      const colCount = node.children[0]?.children.length ?? 1;
      const colWidth = tableWidth / colCount;
      const cellPadding = 4;

      for (let rowIdx = 0; rowIdx < node.children.length; rowIdx++) {
        const row = node.children[rowIdx];
        const isHeader = rowIdx === 0;
        const rowY = doc.y;

        // Draw row background
        if (isHeader) {
          doc.rect(BRAND.margin.left, rowY, tableWidth, 20).fill(BRAND.purple);
        } else if (rowIdx % 2 === 0) {
          doc
            .rect(BRAND.margin.left, rowY, tableWidth, 20)
            .fill(BRAND.lightGrey);
        }

        // Render cells
        for (let colIdx = 0; colIdx < row.children.length; colIdx++) {
          const cell = row.children[colIdx];
          const cellX = BRAND.margin.left + colIdx * colWidth + cellPadding;
          const text = cell.children
            .map((c: PhrasingContent) => ("value" in c ? c.value : ""))
            .join("");

          doc
            .font(isHeader ? "Helvetica-Bold" : "Helvetica")
            .fontSize(CODE_SIZE)
            .fillColor(isHeader ? BRAND.white : BRAND.darkGrey)
            .text(text, cellX, rowY + 4, {
              width: colWidth - cellPadding * 2,
              lineBreak: false,
            });
        }

        doc.y = rowY + 20;
      }

      doc.moveDown(0.5);
      break;
    }

    default:
      break;
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

    // Title
    if (title) {
      doc
        .font("Helvetica-Bold")
        .fontSize(24)
        .fillColor(BRAND.purple)
        .text(title, { lineGap: 8 });
      doc.moveDown(1);
    }

    // Render AST
    const ast = parseMarkdown(markdown);
    for (const node of ast.children) {
      renderBlock(doc, node, { ordered: 0 });
    }

    // Page numbers in footer
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#999999")
        .text(
          `${i + 1} / ${pageCount}`,
          BRAND.margin.left,
          BRAND.pageSize.height - 50,
          {
            width:
              BRAND.pageSize.width - BRAND.margin.left - BRAND.margin.right,
            align: "center",
          }
        );
    }

    doc.end();
  });
}
