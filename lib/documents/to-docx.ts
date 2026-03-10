import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { Content, PhrasingContent } from "mdast";
import { BRAND } from "./brand";
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
  opts: { bold?: boolean; italics?: boolean } = {}
): (TextRun | ExternalHyperlink)[] {
  const runs: (TextRun | ExternalHyperlink)[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case "text":
        runs.push(
          new TextRun({
            text: node.value,
            bold: opts.bold,
            italics: opts.italics,
            font: BRAND.bodyFont,
            size: 22, // 11pt
            color: BRAND.darkGrey,
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
      elements.push(
        new Paragraph({
          heading: HEADING_MAP[depth],
          spacing: { before: 240, after: 120 },
          children: node.children.flatMap((child) =>
            phrasingToRuns([child], {}).map((run) => {
              if (run instanceof TextRun) {
                return new TextRun({
                  text: "value" in node ? String(node.value) : "",
                  bold: depth <= 2,
                  font: BRAND.headingFont,
                  size: HEADING_SIZES[depth] ?? 22,
                  color:
                    depth <= 2 ? BRAND.purple.replace("#", "") : BRAND.darkGrey,
                  ...("text" in run ? {} : {}),
                });
              }
              return run;
            })
          ) as TextRun[],
        })
      );
      // Re-do properly: just use phrasingToRuns with overridden style
      elements.pop();
      const headingRuns = phrasingToRuns(node.children).map((run) => {
        if (run instanceof TextRun) {
          return new TextRun({
            ...extractTextRunProps(run),
            bold: depth <= 2,
            font: BRAND.headingFont,
            size: HEADING_SIZES[depth] ?? 22,
            color: depth <= 2 ? BRAND.purple.replace("#", "") : BRAND.darkGrey,
          });
        }
        return run;
      });
      elements.push(
        new Paragraph({
          heading: HEADING_MAP[depth],
          spacing: { before: 240, after: 120 },
          children: headingRuns as TextRun[],
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
        const rows = node.children.map((row, rowIdx) => {
          const cells = row.children.map(
            (cell) =>
              new TableCell({
                width: { size: 0, type: WidthType.AUTO },
                shading:
                  rowIdx === 0
                    ? {
                        type: ShadingType.SOLID,
                        color: BRAND.purple.replace("#", ""),
                        fill: BRAND.purple.replace("#", ""),
                      }
                    : undefined,
                children: [
                  new Paragraph({
                    children: phrasingToRuns(cell.children, {
                      bold: rowIdx === 0,
                    }).map((run) => {
                      if (run instanceof TextRun && rowIdx === 0) {
                        return new TextRun({
                          ...extractTextRunProps(run),
                          color: "ffffff",
                          bold: true,
                        });
                      }
                      return run;
                    }) as TextRun[],
                  }),
                ],
              })
          );
          return new TableRow({ children: cells });
        });
        elements.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
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

// Helper to extract text run properties for re-creation
// docx TextRun doesn't expose props directly, so we track through our own construction
function extractTextRunProps(_run: TextRun): Record<string, unknown> {
  // TextRun is immutable in docx lib — we can't extract props after construction.
  // Instead, we re-derive from the AST. This helper returns an empty object;
  // callers override the relevant properties explicitly.
  return {};
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

  for (const node of ast.children) {
    bodyChildren.push(...blockToDocx(node));
  }

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
        children: bodyChildren,
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
