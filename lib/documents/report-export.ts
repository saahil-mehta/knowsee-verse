/**
 * Client-side report export — captures the rendered report DOM as HTML or PDF.
 *
 * Uses html2canvas-pro (modern CSS support) + jsPDF for pixel-perfect capture
 * of the interactive dashboard including Recharts visualisations.
 */

import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

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
function resolveComputedSvgColours(
  source: Element,
  target: Element,
): void {
  const computed = window.getComputedStyle(source);
  const svgColourProps = ["fill", "stroke", "stop-color", "flood-color"];

  for (const prop of svgColourProps) {
    const resolved = computed.getPropertyValue(prop);
    if (resolved && resolved !== "none" && resolved !== "") {
      (target as SVGElement | HTMLElement).style?.setProperty(prop, resolved);
    }
  }

  // Also resolve colour and opacity on text elements
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
 * Build a branded header element: Knowsee logo (left) + title (right) + purple rule.
 * Returns a detached DOM node ready to be prepended to the capture container.
 */
function createBrandedHeader(title: string): HTMLDivElement {
  const header = document.createElement("div");
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    border-bottom: 3px solid ${BRAND_PURPLE};
    margin-bottom: 16px;
    background: white;
  `;

  const logo = document.createElement("img");
  logo.src = LOGO_PATH;
  logo.alt = "Knowsee";
  logo.style.cssText = "height: 28px; width: auto;";

  const titleEl = document.createElement("span");
  titleEl.textContent = title;
  titleEl.style.cssText = `
    font-family: Arial, sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: ${BRAND_PURPLE};
  `;

  header.appendChild(logo);
  header.appendChild(titleEl);
  return header;
}

// ─── HTML Export ─────────────────────────────────────────────────────────────

export async function exportReportAsHtml(
  element: HTMLElement,
  title: string,
): Promise<void> {
  // Clone the report DOM so we can mutate freely
  const clone = element.cloneNode(true) as HTMLElement;

  // Collect computed styles from all elements to inline them
  const inlineComputedStyles = (
    source: HTMLElement,
    target: HTMLElement,
  ): void => {
    const computed = window.getComputedStyle(source);
    // Copy a focused set of properties that matter for visual fidelity
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
          targetChildren[i] as HTMLElement,
        );
      }
    }
  };

  inlineComputedStyles(element, clone);

  // Convert SVGs (Recharts) to rasterised PNG data URIs.
  // Recharts SVGs use CSS custom properties for fill/stroke which won't
  // resolve outside the page, so we resolve computed colours first, then
  // render via canvas for a pixel-perfect capture.
  const svgs = element.querySelectorAll("svg");
  const cloneSvgs = clone.querySelectorAll("svg");
  for (let i = 0; i < svgs.length; i++) {
    try {
      const svg = svgs[i];
      // Deep-clone the live SVG so we can mutate it
      const svgClone = svg.cloneNode(true) as SVGElement;

      // Resolve CSS variable colours on every SVG descendant
      resolveComputedSvgColours(svg, svgClone);

      // Copy the root SVG's dimensions explicitly
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

      // Render SVG blob to canvas, then convert to PNG data URI
      await new Promise<void>((resolve) => {
        const canvas = document.createElement("canvas");
        canvas.width = svg.clientWidth * 2;
        canvas.height = svg.clientHeight * 2;
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

  // Build the logo as base64
  let logoDataUri: string;
  try {
    logoDataUri = await toBase64DataUri(LOGO_PATH);
  } catch {
    logoDataUri = "";
  }

  const headerHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:3px solid ${BRAND_PURPLE};margin-bottom:16px;background:white;">
      ${logoDataUri ? `<img src="${logoDataUri}" alt="Knowsee" style="height:28px;width:auto;" />` : `<span style="font-family:Arial,sans-serif;font-size:18px;font-weight:700;color:${BRAND_PURPLE};">Knowsee</span>`}
      <span style="font-family:Arial,sans-serif;font-size:14px;font-weight:600;color:${BRAND_PURPLE};">${title}</span>
    </div>
  `;

  const html = `<!DOCTYPE html>
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
  </style>
</head>
<body>
  ${headerHtml}
  <div style="padding: 0 24px 24px;">
    ${clone.outerHTML}
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitiseFilename(title)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── PDF Export ──────────────────────────────────────────────────────────────

export async function exportReportAsPdf(
  element: HTMLElement,
  title: string,
): Promise<void> {
  // Create an off-screen wrapper with white background and branded header
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    position: fixed;
    top: -99999px;
    left: 0;
    width: ${element.scrollWidth}px;
    background: white;
    color: hsl(240 10% 3.9%);
    z-index: -1;
  `;

  const header = createBrandedHeader(title);
  wrapper.appendChild(header);

  const clone = element.cloneNode(true) as HTMLElement;
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  // Wait a tick for images/layout
  await new Promise((resolve) => setTimeout(resolve, 100));

  try {
    const canvas = await html2canvas(wrapper, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // A4 dimensions in mm
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = (imgHeight / imgWidth) * contentWidth;

    const pdf = new jsPDF({
      orientation: contentHeight > pageHeight ? "portrait" : "portrait",
      unit: "mm",
      format: "a4",
    });

    // If the content is taller than one page, split across pages
    const usableHeight = pageHeight - margin * 2;
    if (contentHeight <= usableHeight) {
      pdf.addImage(imgData, "PNG", margin, margin, contentWidth, contentHeight);
    } else {
      // Calculate how many pages we need
      const totalPages = Math.ceil(contentHeight / usableHeight);
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage();
        }
        // Draw the full image offset by the page position
        const yOffset = margin - page * usableHeight;
        pdf.addImage(
          imgData,
          "PNG",
          margin,
          yOffset,
          contentWidth,
          contentHeight,
        );
      }
    }

    pdf.save(`${sanitiseFilename(title)}.pdf`);
  } finally {
    document.body.removeChild(wrapper);
  }
}
