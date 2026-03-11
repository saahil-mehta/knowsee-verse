import { getOwnedProject } from "@/lib/api/project-auth";
import {
  createBrandProfile,
  getBrandProfileByProjectId,
  updateBrandProfile,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { brandProfileSchema } from "../../schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getOwnedProject(id);

  if ("error" in result) {
    return result.error;
  }

  const profile = await getBrandProfileByProjectId({ projectId: id });

  if (!profile) {
    return new ChatSDKError("not_found:project").toResponse();
  }

  return Response.json(profile);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getOwnedProject(id);

  if ("error" in result) {
    return result.error;
  }

  try {
    const json = await request.json();
    const data = brandProfileSchema.parse(json);
    const created = await createBrandProfile({ projectId: id, ...data });
    return Response.json(created, { status: 201 });
  } catch (_error) {
    return new ChatSDKError("bad_request:project").toResponse();
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getOwnedProject(id);

  if ("error" in result) {
    return result.error;
  }

  try {
    const json = await request.json();
    const data = brandProfileSchema.parse(json);
    const updated = await updateBrandProfile({ projectId: id, ...data });
    return Response.json(updated);
  } catch (_error) {
    return new ChatSDKError("bad_request:project").toResponse();
  }
}
