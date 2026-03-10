import { getFile } from "@/lib/documents/download-store";
import { ChatSDKError } from "@/lib/errors";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter id is required"
    ).toResponse();
  }

  const file = getFile(id);

  if (!file) {
    return new ChatSDKError(
      "not_found:document",
      "File not found or expired"
    ).toResponse();
  }

  return new Response(file.buffer, {
    status: 200,
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Content-Length": String(file.buffer.length),
    },
  });
}
