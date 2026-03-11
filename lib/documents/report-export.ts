/**
 * Client-side report export — captures the rendered report DOM as HTML or PDF.
 *
 * Both formats share the same pipeline: clone the DOM, resolve CSS variable
 * colours on SVG charts, rasterise SVGs to PNG data URIs, and build a
 * self-contained HTML document with the Knowsee branded header.
 *
 * PDF uses the browser's native print-to-PDF via a hidden iframe, keeping
 * text selectable and file sizes small. No external dependencies required.
 */

// Brand constants (client-safe subset of lib/documents/brand.ts)
const BRAND_PURPLE = "#6214d9";
const LOGO_PATH = "/knowsee-logo-light.png";

// Light-theme CSS variables for the self-contained HTML export
const LIGHT_THEME_VARS = `
  --background: hsl(0 0% 100%);
  --foreground: hsl(240 10% 3.9%);
  --card: hsl(0 0% 100%);
  --card-foreground: hsl(240 10% 3.9%);
  --muted: hsl(240 4.8% 95.9%);
  --muted-foreground: hsl(240 3.8% 46.1%);
  --border: hsl(240 5.9% 90%);
  --chart-1: hsl(12 76% 61%);
  --chart-2: hsl(173 58% 39%);
  --chart-3: hsl(197 37% 24%);
  --chart-4: hsl(43 74% 66%);
  --chart-5: hsl(27 87% 67%);
`;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Walk a live SVG and its clone in parallel, resolving computed fill/stroke
 * colours so that CSS custom properties (e.g. var(--chart-1)) become concrete
 * rgb() values in the clone. This is necessary because serialised SVGs lose
 * access to the page's CSS variables.
 */
function resolveComputedSvgColours(source: Element, target: Element): void {
  const computed = window.getComputedStyle(source);
  const svgColourProps = ["fill", "stroke", "stop-color", "flood-color"];

  for (const prop of svgColourProps) {
    const resolved = computed.getPropertyValue(prop);
    if (resolved && resolved !== "none" && resolved !== "") {
      (target as SVGElement | HTMLElement).style?.setProperty(prop, resolved);
    }
  }

  if (source instanceof SVGTextElement || source instanceof SVGTSpanElement) {
    const color = computed.getPropertyValue("color");
    if (color) {
      (target as SVGElement).style.setProperty("fill", color);
    }
  }

  const sourceChildren = source.children;
  const targetChildren = target.children;
  for (let i = 0; i < sourceChildren.length; i++) {
    if (targetChildren[i]) {
      resolveComputedSvgColours(sourceChildren[i], targetChildren[i]);
    }
  }
}

function sanitiseFilename(title: string): string {
  return title
    .replace(/[^a-zA-Z0-9\s-_]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

/** Convert an image URL to a base64 data URI. */
async function toBase64DataUri(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Clone the report element and prepare it for standalone export:
 * - Inline computed styles on all HTML elements
 * - Resolve CSS variable colours on SVG elements
 * - Rasterise SVGs to PNG data URIs
 */
async function prepareClone(element: HTMLElement): Promise<HTMLElement> {
  const clone = element.cloneNode(true) as HTMLElement;

  // Inline computed styles on HTML elements
  const inlineComputedStyles = (
    source: HTMLElement,
    target: HTMLElement
  ): void => {
    const computed = window.getComputedStyle(source);
    const props = [
      "color",
      "background-color",
      "background",
      "font-family",
      "font-size",
      "font-weight",
      "line-height",
      "letter-spacing",
      "text-align",
      "padding",
      "margin",
      "border",
      "border-radius",
      "display",
      "flex-direction",
      "align-items",
      "justify-content",
      "gap",
      "grid-template-columns",
      "width",
      "max-width",
      "min-width",
      "height",
      "max-height",
      "min-height",
      "overflow",
      "box-shadow",
      "opacity",
    ];
    for (const prop of props) {
      const val = computed.getPropertyValue(prop);
      if (val) {
        target.style.setProperty(prop, val);
      }
    }

    const sourceChildren = source.children;
    const targetChildren = target.children;
    for (let i = 0; i < sourceChildren.length; i++) {
      if (sourceChildren[i] instanceof HTMLElement) {
        inlineComputedStyles(
          sourceChildren[i] as HTMLElement,
          targetChildren[i] as HTMLElement
        );
      }
    }
  };

  inlineComputedStyles(element, clone);

  // Rasterise SVGs (Recharts charts) to PNG data URIs
  const svgs = element.querySelectorAll("svg");
  const cloneSvgs = clone.querySelectorAll("svg");
  for (let i = 0; i < svgs.length; i++) {
    try {
      const svg = svgs[i];
      const svgClone = svg.cloneNode(true) as SVGElement;
      resolveComputedSvgColours(svg, svgClone);

      if (!svgClone.getAttribute("width")) {
        svgClone.setAttribute("width", String(svg.clientWidth));
      }
      if (!svgClone.getAttribute("height")) {
        svgClone.setAttribute("height", String(svg.clientHeight));
      }

      const serialiser = new XMLSerializer();
      const svgString = serialiser.serializeToString(svgClone);
      const svgBlob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      const img = document.createElement("img");
      img.style.cssText = `width: ${svg.clientWidth}px; height: ${svg.clientHeight}px;`;

      await new Promise<void>((resolve) => {
        const canvas = document.createElement("canvas");
        canvas.width = svg.clientWidth * 2;
        canvas.height = svg.clientHeight * 2;
        // biome-ignore lint/style/noNonNullAssertion: canvas 2d context always exists for in-memory canvas
        const ctx = canvas.getContext("2d")!;
        const image = new Image();
        image.onload = () => {
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          img.src = canvas.toDataURL("image/png");
          URL.revokeObjectURL(url);
          resolve();
        };
        image.onerror = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        image.src = url;
      });

      cloneSvgs[i].parentNode?.replaceChild(img, cloneSvgs[i]);
    } catch {
      // Keep original SVG on failure
    }
  }

  return clone;
}

/** Build the branded header as an HTML string with base64-embedded logo. */
async function buildHeaderHtml(title: string): Promise<string> {
  let logoDataUri: string;
  try {
    logoDataUri = await toBase64DataUri(LOGO_PATH);
  } catch {
    logoDataUri = "";
  }

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:3px solid ${BRAND_PURPLE};margin-bottom:16px;background:white;">
      ${logoDataUri ? `<img src="${logoDataUri}" alt="Knowsee" style="height:28px;width:auto;" />` : `<span style="font-family:Arial,sans-serif;font-size:18px;font-weight:700;color:${BRAND_PURPLE};">Knowsee</span>`}
      <span style="font-family:Arial,sans-serif;font-size:14px;font-weight:600;color:${BRAND_PURPLE};">${title}</span>
    </div>
  `;
}

/** Build a complete self-contained HTML document from the prepared clone. */
async function buildHtmlDocument(
  element: HTMLElement,
  title: string,
  extraStyles?: string
): Promise<string> {
  const clone = await prepareClone(element);
  const headerHtml = await buildHeaderHtml(title);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    :root { ${LIGHT_THEME_VARS} }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: hsl(0 0% 100%);
      color: hsl(240 10% 3.9%);
      padding: 0;
    }
    img { max-width: 100%; }
    ${extraStyles ?? ""}
  </style>
</head>
<body>
  ${headerHtml}
  <div style="padding: 0 24px 24px;">
    ${clone.outerHTML}
  </div>
</body>
</html>`;
}

// ─── HTML Export ─────────────────────────────────────────────────────────────

export async function exportReportAsHtml(
  element: HTMLElement,
  title: string
): Promise<void> {
  const html = await buildHtmlDocument(element, title);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitiseFilename(title)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── PDF Export ──────────────────────────────────────────────────────────────

/**
 * Uses the browser's native print pipeline via a hidden iframe.
 * Text remains selectable, files are small, and pagination is handled
 * by the browser's print engine.
 */
export async function exportReportAsPdf(
  element: HTMLElement,
  title: string
): Promise<void> {
  const printStyles = `
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      img { break-inside: avoid; }
    }
    @page {
      size: A4;
      margin: 15mm;
    }
  `;
  const html = await buildHtmlDocument(element, title, printStyles);

  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;top:-99999px;left:-99999px;width:0;height:0;border:none;";
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error("Could not access iframe document");
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // Wait for images to load inside the iframe
    await new Promise<void>((resolve) => {
      const images = iframeDoc.querySelectorAll("img");
      if (images.length === 0) {
        resolve();
        return;
      }
      let loaded = 0;
      const onLoad = () => {
        loaded++;
        if (loaded >= images.length) {
          resolve();
        }
      };
      for (const img of images) {
        if (img.complete) {
          onLoad();
        } else {
          img.addEventListener("load", onLoad);
          img.addEventListener("error", onLoad);
        }
      }
    });

    iframe.contentWindow?.print();
  } finally {
    // Clean up after a short delay to let the print dialog open
    setTimeout(() => document.body.removeChild(iframe), 1000);
  }
}
