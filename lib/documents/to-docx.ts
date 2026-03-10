import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { Content, PhrasingContent } from "mdast";
import { BRAND } from "./brand";

// Cache the wordmark logo buffer for DOCX headers
let _logoDocx: Buffer | null = null;
function getLogoForDocx(): Buffer | null {
  if (_logoDocx) return _logoDocx;
  try {
    _logoDocx = readFileSync(
      join(process.cwd(), "public", "knowsee-logo-light.png")
    );
    return _logoDocx;
  } catch {
    return null;
  }
}
import { parseMarkdown } from "./parse-markdown";

// ---------------------------------------------------------------------------
// Markdown → DOCX converter
// ---------------------------------------------------------------------------

const HEADING_MAP: Record<
  number,
  (typeof HeadingLevel)[keyof typeof HeadingLevel]
> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
};

const HEADING_SIZES: Record<number, number> = {
  1: 32, // 16pt
  2: 28, // 14pt
  3: 24, // 12pt
  4: 22, // 11pt
};

// ---------------------------------------------------------------------------
// Inline content (phrasing) → TextRun[]
// ---------------------------------------------------------------------------

function phrasingToRuns(
  nodes: PhrasingContent[],
  opts: {
    bold?: boolean;
    italics?: boolean;
    color?: string;
    font?: string;
    size?: number;
  } = {}
): (TextRun | ExternalHyperlink)[] {
  const runs: (TextRun | ExternalHyperlink)[] = [];
  const runFont = opts.font ?? BRAND.bodyFont;
  const runSize = opts.size ?? 22; // 11pt default
  const runColor = opts.color ?? BRAND.darkGrey;

  for (const node of nodes) {
    switch (node.type) {
      case "text":
        runs.push(
          new TextRun({
            text: node.value,
            bold: opts.bold,
            italics: opts.italics,
            font: runFont,
            size: runSize,
            color: runColor,
          })
        );
        break;

      case "strong":
        runs.push(...phrasingToRuns(node.children, { ...opts, bold: true }));
        break;

      case "emphasis":
        runs.push(...phrasingToRuns(node.children, { ...opts, italics: true }));
        break;

      case "inlineCode":
        runs.push(
          new TextRun({
            text: node.value,
            font: BRAND.monoFont,
            size: 20,
            shading: {
              type: ShadingType.SOLID,
              color: BRAND.lightGrey.replace("#", ""),
              fill: BRAND.lightGrey.replace("#", ""),
            },
          })
        );
        break;

      case "link":
        runs.push(
          new ExternalHyperlink({
            link: node.url,
            children: [
              new TextRun({
                text:
                  node.children
                    .map((c) => ("value" in c ? c.value : ""))
                    .join("") || node.url,
                style: "Hyperlink",
                font: BRAND.bodyFont,
                size: 22,
              }),
            ],
          })
        );
        break;

      case "break":
        runs.push(new TextRun({ break: 1 }));
        break;

      default:
        // Fallback: extract text value if present
        if ("value" in node && typeof node.value === "string") {
          runs.push(
            new TextRun({
              text: node.value,
              font: BRAND.bodyFont,
              size: 22,
              color: BRAND.darkGrey,
            })
          );
        }
        break;
    }
  }

  return runs;
}

// ---------------------------------------------------------------------------
// Block content → Paragraph[]
// ---------------------------------------------------------------------------

function blockToDocx(node: Content, listLevel?: number): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  switch (node.type) {
    case "heading": {
      const depth = Math.min(node.depth, 4);
      const headingColor =
        depth <= 2 ? BRAND.purple.replace("#", "") : BRAND.darkGrey;

      elements.push(
        new Paragraph({
          heading: HEADING_MAP[depth],
          spacing: { before: 240, after: 120 },
          children: phrasingToRuns(node.children, {
            bold: depth <= 2,
            font: BRAND.headingFont,
            size: HEADING_SIZES[depth] ?? 22,
            color: headingColor,
          }) as TextRun[],
        })
      );
      break;
    }

    case "paragraph":
      elements.push(
        new Paragraph({
          spacing: { after: 160 },
          children: phrasingToRuns(node.children) as TextRun[],
        })
      );
      break;

    case "list":
      for (const item of node.children) {
        for (const child of item.children) {
          const level = listLevel ?? 0;
          if (child.type === "paragraph") {
            elements.push(
              new Paragraph({
                numbering: {
                  reference: node.ordered ? "ordered-list" : "bullet-list",
                  level,
                },
                spacing: { after: 80 },
                children: phrasingToRuns(child.children) as TextRun[],
              })
            );
          } else if (child.type === "list") {
            elements.push(...blockToDocx(child, level + 1));
          } else {
            elements.push(...blockToDocx(child, level));
          }
        }
      }
      break;

    case "code":
      elements.push(
        new Paragraph({
          spacing: { before: 120, after: 120 },
          shading: {
            type: ShadingType.SOLID,
            color: BRAND.lightGrey.replace("#", ""),
            fill: BRAND.lightGrey.replace("#", ""),
          },
          children: [
            new TextRun({
              text: node.value,
              font: BRAND.monoFont,
              size: 18, // 9pt
              color: BRAND.darkGrey,
            }),
          ],
        })
      );
      break;

    case "blockquote":
      for (const child of node.children) {
        const paras = blockToDocx(child);
        for (const p of paras) {
          if (p instanceof Paragraph) {
            elements.push(
              new Paragraph({
                indent: { left: 720 }, // 0.5 inch
                border: {
                  left: {
                    style: BorderStyle.SINGLE,
                    size: 6,
                    color: BRAND.purple.replace("#", ""),
                    space: 8,
                  },
                },
                spacing: { after: 120 },
                children: phrasingToRuns(
                  child.type === "paragraph" ? child.children : []
                ) as TextRun[],
              })
            );
          } else {
            elements.push(p);
          }
        }
      }
      break;

    case "thematicBreak":
      elements.push(
        new Paragraph({
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: "cccccc",
              space: 8,
            },
          },
          spacing: { before: 200, after: 200 },
          children: [],
        })
      );
      break;

    case "table":
      if (node.children.length > 0) {
        // A4 content width in twips: 11906 - 2*1440 = 9026
        const contentWidthTwips = 9026;
        const colCount = node.children[0]?.children.length ?? 1;
        const colWidthTwips = Math.floor(contentWidthTwips / colCount);

        const rows = node.children.map((row, rowIdx) => {
          const cells = row.children.map(
            (cell) =>
              new TableCell({
                width: { size: colWidthTwips, type: WidthType.DXA },
                shading:
                  rowIdx === 0
                    ? {
                        type: ShadingType.SOLID,
                        color: BRAND.purple.replace("#", ""),
                        fill: BRAND.purple.replace("#", ""),
                      }
                    : rowIdx % 2 === 0
                      ? {
                          type: ShadingType.SOLID,
                          color: "F5F0FF",
                          fill: "F5F0FF",
                        }
                      : undefined,
                children: [
                  new Paragraph({
                    children: phrasingToRuns(cell.children, {
                      bold: rowIdx === 0,
                      ...(rowIdx === 0 ? { color: "ffffff" } : {}),
                    }) as TextRun[],
                  }),
                ],
              })
          );
          return new TableRow({ children: cells });
        });
        elements.push(
          new Table({
            width: { size: contentWidthTwips, type: WidthType.DXA },
            layout: TableLayoutType.FIXED,
            rows,
          })
        );
      }
      break;

    default:
      break;
  }

  return elements;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function markdownToDocx(
  markdown: string,
  title?: string
): Promise<Buffer> {
  const ast = parseMarkdown(markdown);
  const bodyChildren: (Paragraph | Table)[] = [];

  // Title page heading if provided
  if (title) {
    bodyChildren.push(
      new Paragraph({
        heading: HeadingLevel.TITLE,
        spacing: { after: 400 },
        children: [
          new TextRun({
            text: title,
            bold: true,
            font: BRAND.headingFont,
            size: 48, // 24pt
            color: BRAND.purple.replace("#", ""),
          }),
        ],
      })
    );
  }

  let skipFirstH1 = !!title;
  for (const node of ast.children) {
    if (skipFirstH1 && node.type === "heading" && node.depth === 1) {
      skipFirstH1 = false;
      continue;
    }
    bodyChildren.push(...blockToDocx(node));
  }

  const docTitle = title ?? "Document";

  const logo = getLogoForDocx();
  // Logo is 522x161px; scale to 14pt height → ~45pt width (matching PDF)
  const logoHeight = 14;
  const logoWidth = Math.round(logoHeight * (522 / 161));
  // A4 content width in twips = 9026
  const contentWidthTwips = 9026;

  const noBorder = {
    style: BorderStyle.NONE,
    size: 0,
    color: "FFFFFF",
  };
  const noBorders = {
    top: noBorder,
    bottom: noBorder,
    left: noBorder,
    right: noBorder,
  };

  const logoCellChildren: (ImageRun | TextRun)[] = [];
  if (logo) {
    logoCellChildren.push(
      new ImageRun({
        data: logo,
        transformation: { width: logoWidth, height: logoHeight },
        type: "png",
      })
    );
  } else {
    logoCellChildren.push(
      new TextRun({
        text: "Knowsee",
        bold: true,
        font: BRAND.headingFont,
        size: 16,
        color: BRAND.purple.replace("#", ""),
      })
    );
  }

  const headerContent = new Header({
    children: [
      new Table({
        width: { size: contentWidthTwips, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: Math.floor(contentWidthTwips / 2), type: WidthType.DXA },
                borders: noBorders,
                children: [
                  new Paragraph({
                    children: logoCellChildren,
                  }),
                ],
              }),
              new TableCell({
                width: { size: Math.floor(contentWidthTwips / 2), type: WidthType.DXA },
                borders: noBorders,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new TextRun({
                        text: docTitle,
                        font: BRAND.bodyFont,
                        size: 16,
                        color: "999999",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new Paragraph({
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 4,
            color: BRAND.purple.replace("#", ""),
            space: 4,
          },
        },
        spacing: { after: 120 },
        children: [],
      }),
    ],
  });

  const footerContent = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: {
          top: {
            style: BorderStyle.SINGLE,
            size: 2,
            color: "cccccc",
            space: 4,
          },
        },
        children: [
          new TextRun({
            text: "Knowsee  |  Page ",
            font: BRAND.bodyFont,
            size: 16,
            color: "999999",
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            font: BRAND.bodyFont,
            size: 16,
            color: "999999",
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "bullet-list",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "\u2022",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
            {
              level: 1,
              format: LevelFormat.BULLET,
              text: "\u25E6",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 1440, hanging: 360 } },
              },
            },
            {
              level: 2,
              format: LevelFormat.BULLET,
              text: "\u25AA",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 2160, hanging: 360 } },
              },
            },
          ],
        },
        {
          reference: "ordered-list",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
            {
              level: 1,
              format: LevelFormat.LOWER_LETTER,
              text: "%2.",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 1440, hanging: 360 } },
              },
            },
            {
              level: 2,
              format: LevelFormat.LOWER_ROMAN,
              text: "%3.",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 2160, hanging: 360 } },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11_906, // A4 width in twips (DXA)
              height: 16_838, // A4 height in twips
            },
            margin: {
              top: 1440, // 1 inch in twips
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        headers: { default: headerContent },
        footers: { default: footerContent },
        children: bodyChildren,
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
