/**
 * Client-side report export — captures the rendered report DOM as HTML or PDF.
 *
 * The export always produces a LIGHT-mode document regardless of the user's
 * current theme. This is achieved by temporarily removing the `.dark` class
 * from <html> for the duration of the synchronous style-capture pass, so that
 * `getComputedStyle()` reads light-theme values into the clone's inline styles.
 * The class is restored before any async work — the toggle is never painted.
 *
 * PDF uses the browser's native print-to-PDF via a hidden iframe, with
 * Paged.js polyfilling CSS Paged Media for proper page-break handling,
 * running headers, and page numbers. Text remains selectable and file
 * sizes stay small.
 */

// Brand constants (client-safe subset of lib/documents/brand.ts)
const BRAND_PURPLE = "#6214d9";
const LOGO_PATH = "/knowsee-logo-light.png";

// Full light-theme CSS variable set mirrored from app/globals.css :root.
// Kept in sync so the exported document matches the in-app light appearance.
const LIGHT_THEME_VARS = `
  --background: hsl(0 0% 100%);
  --foreground: hsl(240 10% 3.9%);
  --card: hsl(0 0% 100%);
  --card-foreground: hsl(240 10% 3.9%);
  --popover: hsl(0 0% 100%);
  --popover-foreground: hsl(240 10% 3.9%);
  --primary: hsl(240 5.9% 10%);
  --primary-foreground: hsl(0 0% 98%);
  --secondary: hsl(240 4.8% 95.9%);
  --secondary-foreground: hsl(240 5.9% 10%);
  --muted: hsl(240 4.8% 95.9%);
  --muted-foreground: hsl(240 3.8% 46.1%);
  --accent: hsl(240 4.8% 95.9%);
  --accent-foreground: hsl(240 5.9% 10%);
  --destructive: hsl(0 84.2% 60.2%);
  --destructive-foreground: hsl(0 0% 98%);
  --border: hsl(240 5.9% 90%);
  --input: hsl(240 5.9% 90%);
  --ring: hsl(240 10% 3.9%);
  --chart-1: hsl(12 76% 61%);
  --chart-2: hsl(173 58% 39%);
  --chart-3: hsl(197 37% 24%);
  --chart-4: hsl(43 74% 66%);
  --chart-5: hsl(27 87% 67%);
  --radius: 0.5rem;
  color-scheme: light;
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

// Visual style props safe to inline. Height, max-height, min-height, and
// overflow are deliberately NOT in this list — inlining them onto section
// cards freezes their dimensions and prevents Paged.js from paginating
// tall cards correctly.
const BASE_INLINE_PROPS = [
  "color",
  "background-color",
  "background",
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing",
  "text-align",
  "white-space",
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
  "box-shadow",
  "opacity",
];

// Width-related properties are frozen only on block-level elements. For
// inline/inline-block elements we leave width auto so fonts can resize
// content without forcing wraps (e.g. the HIGH/MEDIUM/LOW impact pill).
const WIDTH_INLINE_PROPS = ["width", "max-width", "min-width"];

function inlineComputedStyles(source: HTMLElement, target: HTMLElement): void {
  const computed = window.getComputedStyle(source);
  const display = computed.getPropertyValue("display");
  const isInline = display.startsWith("inline");

  const props = isInline
    ? BASE_INLINE_PROPS
    : [...BASE_INLINE_PROPS, ...WIDTH_INLINE_PROPS];

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
}

type PendingSvg = {
  cloneSvg: SVGElement;
  blobUrl: string;
  width: number;
  height: number;
};

/**
 * Synchronous style capture under a forced-light cascade.
 *
 * Removes `.dark` from <html>, forces a style flush, clones the subtree and
 * inlines computed light-theme styles onto the clone. For each SVG, resolves
 * CSS-variable colours against the source (now light) and serialises to a
 * blob URL ready for async rasterisation. Finally restores `.dark`.
 *
 * The entire function runs without any await, so the browser never paints
 * the intermediate light state — the theme toggle is invisible to the user.
 */
function captureUnderLightTheme(element: HTMLElement): {
  clone: HTMLElement;
  pendingSvgs: PendingSvg[];
} {
  const html = document.documentElement;
  const wasDark = html.classList.contains("dark");
  if (wasDark) {
    html.classList.remove("dark");
  }

  try {
    // Force style recalculation so getComputedStyle reads light values.
    // Reading a layout-triggering property synchronously flushes pending
    // style work — the assignment dance is the simplest cross-browser idiom.
    const _flush = html.offsetHeight;
    if (_flush < 0) {
      // unreachable — keeps the expression from being tree-shaken
      throw new Error("impossible");
    }

    const clone = element.cloneNode(true) as HTMLElement;
    inlineComputedStyles(element, clone);

    // Resolve SVG colours and serialise to blob URLs (still sync, still light)
    const pendingSvgs: PendingSvg[] = [];
    const sourceSvgs = element.querySelectorAll("svg");
    const cloneSvgs = clone.querySelectorAll("svg");

    for (let i = 0; i < sourceSvgs.length; i++) {
      const svg = sourceSvgs[i];
      const svgClone = svg.cloneNode(true) as SVGElement;
      resolveComputedSvgColours(svg, svgClone);

      const width = svg.clientWidth || svg.getBoundingClientRect().width;
      const height = svg.clientHeight || svg.getBoundingClientRect().height;

      if (!svgClone.getAttribute("width")) {
        svgClone.setAttribute("width", String(width));
      }
      if (!svgClone.getAttribute("height")) {
        svgClone.setAttribute("height", String(height));
      }
      if (!svgClone.getAttribute("xmlns")) {
        svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      }

      const svgString = new XMLSerializer().serializeToString(svgClone);
      const blobUrl = URL.createObjectURL(
        new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })
      );

      pendingSvgs.push({
        cloneSvg: cloneSvgs[i] as SVGElement,
        blobUrl,
        width,
        height,
      });
    }

    return { clone, pendingSvgs };
  } finally {
    if (wasDark) {
      html.classList.add("dark");
    }
  }
}

/**
 * Asynchronously rasterise each pending SVG to a PNG data URI at 2x pixel
 * density, then swap it into the clone. Safe to run after `.dark` has been
 * restored because all colour values are already baked into the SVG strings.
 */
async function rasteriseSvgs(pending: PendingSvg[]): Promise<void> {
  for (const { cloneSvg, blobUrl, width, height } of pending) {
    try {
      const dataUri = await new Promise<string>((resolve) => {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * 2));
        canvas.height = Math.max(1, Math.round(height * 2));
        // biome-ignore lint/style/noNonNullAssertion: canvas 2d context always exists
        const ctx = canvas.getContext("2d")!;
        const image = new Image();
        image.onload = () => {
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/png"));
        };
        image.onerror = () => resolve("");
        image.src = blobUrl;
      });

      if (dataUri) {
        const img = document.createElement("img");
        img.src = dataUri;
        img.style.cssText = `width:${width}px;height:${height}px;max-width:100%;display:block;margin:0 auto;`;
        cloneSvg.parentNode?.replaceChild(img, cloneSvg);
      }
    } catch {
      // keep original SVG on failure
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }
}

async function prepareClone(element: HTMLElement): Promise<HTMLElement> {
  const { clone, pendingSvgs } = captureUnderLightTheme(element);
  await rasteriseSvgs(pendingSvgs);
  return clone;
}

/** Build the branded header as an HTML string with base64-embedded logo. */
async function buildHeaderHtml(
  title: string,
  dateStr: string
): Promise<string> {
  let logoDataUri: string;
  try {
    logoDataUri = await toBase64DataUri(LOGO_PATH);
  } catch {
    logoDataUri = "";
  }

  return `
    <header class="knowsee-report-header">
      ${
        logoDataUri
          ? `<img src="${logoDataUri}" alt="Knowsee" class="knowsee-logo" />`
          : `<span class="knowsee-wordmark">Knowsee</span>`
      }
      <div class="knowsee-header-meta">
        <span class="knowsee-header-title">${title}</span>
        <span class="knowsee-header-date">${dateStr}</span>
      </div>
    </header>
  `;
}

// Baseline CSS shared by HTML and PDF exports.
const BASE_STYLES = `
  :root { ${LIGHT_THEME_VARS} }

  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }

  html {
    color-scheme: light;
    background: #ffffff;
  }

  body {
    font-family: "Inter", "Google Sans", -apple-system, BlinkMacSystemFont,
      "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: #ffffff;
    color: hsl(240 10% 3.9%);
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }

  img, svg { max-width: 100%; height: auto; }

  a { color: inherit; text-decoration: none; }

  /* Branded body header (appears once at top of document). Paged.js
     renders running headers in the page margin boxes (see paged styles). */
  .knowsee-report-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 24px;
    border-bottom: 3px solid ${BRAND_PURPLE};
    background: #ffffff;
    margin-bottom: 8px;
  }
  .knowsee-logo { height: 26px; width: auto; }
  .knowsee-wordmark {
    font-size: 18px;
    font-weight: 700;
    color: ${BRAND_PURPLE};
    letter-spacing: -0.01em;
  }
  .knowsee-header-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }
  .knowsee-header-title {
    font-size: 13px;
    font-weight: 600;
    color: ${BRAND_PURPLE};
  }
  .knowsee-header-date {
    font-size: 11px;
    color: hsl(240 3.8% 46.1%);
  }

  .knowsee-report-body {
    padding: 8px 24px 32px;
    max-width: 900px;
    margin: 0 auto;
  }

  /* Preserve internal spacing the flex container normally provides */
  [data-report-content] > * + * { margin-top: 16px; }

  /* Tables always fit their container and wrap long words */
  [data-report-content] table {
    width: 100%;
    table-layout: auto;
    border-collapse: collapse;
  }
  [data-report-content] td,
  [data-report-content] th {
    overflow-wrap: anywhere;
    word-break: break-word;
  }
`;

// Fallback print styles. Used when Paged.js doesn't run (HTML export, or
// if the polyfill fails to load). When Paged.js runs, these are largely
// superseded by proper CSS Paged Media handling.
const PRINT_STYLES = `
  @page {
    size: A4;
    margin: 16mm 16mm 18mm;
  }

  @media print {
    html, body {
      background: #ffffff !important;
      color: hsl(240 10% 3.9%) !important;
    }

    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .knowsee-report-body {
      padding: 0 !important;
      max-width: 100% !important;
      margin: 0 !important;
    }
    [data-report-content],
    [data-report-content] > div,
    [data-report-content] .rounded-lg {
      max-width: 100% !important;
      width: auto !important;
    }
    [data-report-content] table {
      width: 100% !important;
      max-width: 100% !important;
    }
    [data-report-content] img {
      max-width: 100% !important;
      height: auto !important;
    }

    .knowsee-report-header {
      margin-bottom: 0;
    }

    h1, h2, h3, h4, h5, h6 {
      break-after: avoid;
      page-break-after: avoid;
    }

    /* Section-level cards flow across pages (Paged.js handles the finer
       break decisions; native print falls back to this). */
    [data-report-content] > div,
    [data-report-content] .rounded-lg {
      break-inside: auto;
      page-break-inside: auto;
    }

    /* Individual recommendation items stay atomic. */
    .border-l-4 {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    table { break-inside: auto; page-break-inside: auto; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr    { break-inside: avoid; page-break-inside: avoid; }

    p, li { widows: 3; orphans: 3; }

    img, svg {
      break-inside: avoid;
      page-break-inside: avoid;
      max-width: 100%;
    }
  }
`;

/**
 * Paged.js CSS — proper CSS Paged Media rules for page margins, running
 * headers, page numbers. Used by exportReportAsPdf when the polyfill is
 * loaded in the iframe; exportReportAsHtml skips these to keep the HTML
 * output as a scrollable document.
 */
function buildPagedMediaStyles(title: string, dateStr: string): string {
  const escTitle = title.replace(/"/g, '\\"').replace(/\\/g, "\\\\");
  const escDate = dateStr.replace(/"/g, '\\"');

  return `
    @page {
      size: A4;
      margin: 22mm 16mm 18mm 16mm;

      @top-left {
        content: "Knowsee · ${escTitle}";
        font-family: Inter, sans-serif;
        font-size: 9px;
        color: ${BRAND_PURPLE};
        font-weight: 600;
      }

      @top-right {
        content: "${escDate}";
        font-family: Inter, sans-serif;
        font-size: 9px;
        color: hsl(240 3.8% 46.1%);
      }

      @bottom-right {
        content: counter(page) " / " counter(pages);
        font-family: Inter, sans-serif;
        font-size: 9px;
        color: hsl(240 3.8% 46.1%);
      }
    }

    /* First page carries the big body header; suppress the running header
       there so the chrome isn't duplicated with the body branding. */
    @page :first {
      @top-left { content: none; }
      @top-right { content: none; }
    }

    /* The body header only needs to appear on page 1. */
    .knowsee-report-header { break-after: avoid; }
  `;
}

type BuildHtmlOptions = {
  /** When true, include the Paged.js polyfill and CSS Paged Media rules. */
  paged?: boolean;
};

/** Build a complete self-contained HTML document from the prepared clone. */
async function buildHtmlDocument(
  element: HTMLElement,
  title: string,
  options: BuildHtmlOptions = {}
): Promise<string> {
  const clone = await prepareClone(element);

  const dateStr = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const headerHtml = await buildHeaderHtml(title, dateStr);

  const pagedStyles = options.paged
    ? buildPagedMediaStyles(title, dateStr)
    : "";
  const pagedScript = options.paged
    ? `<script src="/vendor/paged.polyfill.js"></script>`
    : "";

  return `<!DOCTYPE html>
<html lang="en" class="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>${title}</title>
  <style>${BASE_STYLES}${PRINT_STYLES}${pagedStyles}</style>
  ${pagedScript}
</head>
<body>
  ${headerHtml}
  <main class="knowsee-report-body">
    ${clone.outerHTML}
  </main>
</body>
</html>`;
}

// ─── HTML Export ─────────────────────────────────────────────────────────────

export async function exportReportAsHtml(
  element: HTMLElement,
  title: string
): Promise<void> {
  const html = await buildHtmlDocument(element, title);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitiseFilename(title)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── PDF Export ──────────────────────────────────────────────────────────────

/** Wait for all <img> elements in the document to load (or error). */
function waitForImages(doc: Document): Promise<void> {
  return new Promise((resolve) => {
    const images = Array.from(doc.querySelectorAll("img"));
    if (images.length === 0) {
      resolve();
      return;
    }
    let remaining = images.length;
    const onLoad = () => {
      remaining -= 1;
      if (remaining <= 0) {
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
}

/**
 * Wait for Paged.js to finish paginating the document. Resolves when the
 * `.pagedjs_pages` container has been inserted; falls back after a timeout
 * so a polyfill that failed to load does not block printing indefinitely.
 */
function waitForPagedjs(doc: Document): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    const TIMEOUT_MS = 20_000;
    let pagesSeen = false;

    const check = () => {
      if (doc.querySelector(".pagedjs_pages")) {
        if (pagesSeen) {
          resolve();
          return;
        }
        // Saw the pagination container; give one more tick for any
        // final-state bookkeeping (class toggles, post-render hooks).
        pagesSeen = true;
        setTimeout(check, 250);
        return;
      }
      if (Date.now() - start > TIMEOUT_MS) {
        // Polyfill didn't run or timed out; print whatever we have.
        resolve();
        return;
      }
      setTimeout(check, 120);
    };
    check();
  });
}

/**
 * Uses the browser's native print pipeline via a hidden iframe, with
 * Paged.js polyfilling CSS Paged Media for clean pagination, running
 * headers, and page numbers.
 */
export async function exportReportAsPdf(
  element: HTMLElement,
  title: string
): Promise<void> {
  const html = await buildHtmlDocument(element, title, { paged: true });

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error("Could not access iframe document");
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // Base64 images are synchronous, but external images (e.g. the logo
    // data URI) may still need a tick. Wait regardless.
    await waitForImages(iframeDoc);

    // Paged.js paginates the DOM into .pagedjs_pages. Wait for it to
    // finish so print() captures the paginated output, not the raw flow.
    await waitForPagedjs(iframeDoc);

    // One extra frame so layout settles before print
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  } finally {
    // Clean up after a short delay to let the print dialog open
    setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 1500);
  }
}
