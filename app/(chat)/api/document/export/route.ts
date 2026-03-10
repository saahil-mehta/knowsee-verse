import { getSession } from "@/lib/auth";
import { getDocumentsById } from "@/lib/db/queries";
import { markdownToDocx, markdownToPdf } from "@/lib/documents";
import { ChatSDKError } from "@/lib/errors";

const VALID_FORMATS = ["docx", "pdf"] as const;
type ExportFormat = (typeof VALID_FORMATS)[number];

const CONTENT_TYPES: Record<ExportFormat, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const format = searchParams.get("format") as ExportFormat | null;

  if (!id || !format || !VALID_FORMATS.includes(format)) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameters id and format (docx|pdf) are required"
    ).toResponse();
  }

  const session = await getSession();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:document").toResponse();
  }

  const documents = await getDocumentsById({ id });
  const [document] = documents;

  if (!document) {
    return new ChatSDKError("not_found:document").toResponse();
  }

  if (document.userId !== session.user.id) {
    return new ChatSDKError("forbidden:document").toResponse();
  }

  if (!document.content) {
    return new ChatSDKError(
      "bad_request:document",
      "Document has no content to export"
    ).toResponse();
  }

  const buffer =
    format === "docx"
      ? await markdownToDocx(document.content, document.title)
      : await markdownToPdf(document.content, document.title);

  const filename = `${document.title.replace(/[^a-zA-Z0-9-_ ]/g, "").trim()}.${format}`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": CONTENT_TYPES[format],
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
