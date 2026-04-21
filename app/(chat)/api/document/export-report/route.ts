import { getSession } from "@/lib/auth";
import { getDocumentById } from "@/lib/db/queries";
import { signPrintToken } from "@/lib/documents/print-token";
import { launchBrowser } from "@/lib/documents/puppeteer";
import { ChatSDKError } from "@/lib/errors";

export const maxDuration = 60;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_FORMATS = ["pdf", "html"] as const;
type ExportFormat = (typeof VALID_FORMATS)[number];

const CONTENT_TYPES: Record<ExportFormat, string> = {
  pdf: "application/pdf",
  html: "text/html; charset=utf-8",
};

function sanitiseFilename(title: string): string {
  const cleaned = title
    .replace(/[^a-zA-Z0-9\s\-_]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
  return cleaned || "report";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const format = searchParams.get("format") as ExportFormat | null;

  if (!id || !format || !VALID_FORMATS.includes(format)) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameters id and format (pdf|html) are required"
    ).toResponse();
  }

  const session = await getSession();
  if (!session?.user) {
    return new ChatSDKError("unauthorized:document").toResponse();
  }

  const doc = await getDocumentById({ id });
  if (!doc) {
    return new ChatSDKError("not_found:document").toResponse();
  }
  if (doc.userId !== session.user.id) {
    return new ChatSDKError("forbidden:document").toResponse();
  }
  if (!doc.content) {
    return new ChatSDKError(
      "bad_request:document",
      "Document has no content to export"
    ).toResponse();
  }

  const token = signPrintToken(id);
  const origin = new URL(request.url).origin;
  const printUrl = `${origin}/print/${id}?token=${token}`;

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();

    // A4 at 96 DPI — matches the max-width in print.css.
    await page.setViewport({ width: 794, height: 1123 });
    await page.emulateMediaType("screen");

    await page.goto(printUrl, {
      waitUntil: "networkidle0",
      timeout: 30_000,
    });

    // The print-document client emits this sentinel once charts have
    // settled. Without it, page.pdf() can capture mid-render.
    await page.waitForSelector("[data-report-ready]", { timeout: 15_000 });

    const filename = sanitiseFilename(doc.title);
    const dateStr = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    if (format === "pdf") {
      const headerTemplate = `
        <div style="font-size:8px; color:#6b7280; width:100%; padding:0 16mm; display:flex; justify-content:space-between; font-family:'Helvetica Neue', Arial, sans-serif;">
          <span style="color:#6214d9; font-weight:600;">Knowsee · ${doc.title.replace(/</g, "&lt;").replace(/"/g, "&quot;")}</span>
          <span>${dateStr}</span>
        </div>
      `;
      const footerTemplate = `
        <div style="font-size:8px; color:#9ca3af; width:100%; padding:0 16mm; text-align:right; font-family:'Helvetica Neue', Arial, sans-serif;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>
      `;

      const pdf = await page.pdf({
        format: "A4",
        margin: {
          top: "22mm",
          right: "16mm",
          bottom: "18mm",
          left: "16mm",
        },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate,
        footerTemplate,
      });

      return new Response(pdf, {
        status: 200,
        headers: {
          "Content-Type": CONTENT_TYPES.pdf,
          "Content-Disposition": `attachment; filename="${filename}.pdf"`,
          "Content-Length": String(pdf.length),
        },
      });
    }

    // HTML export: serialise the fully-rendered, hydrated DOM as a
    // self-contained document.
    const html = await page.content();
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": CONTENT_TYPES.html,
        "Content-Disposition": `attachment; filename="${filename}.html"`,
      },
    });
  } finally {
    await browser.close();
  }
}
