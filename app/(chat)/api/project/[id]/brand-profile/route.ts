import { getSession } from "@/lib/auth";
import {
  createBrandProfile,
  getBrandProfileByProjectId,
  getProjectById,
  updateBrandProfile,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { brandProfileSchema } from "../../schema";

async function getOwnedProject(id: string) {
  const session = await getSession();

  if (!session?.user) {
    return { error: new ChatSDKError("unauthorized:project").toResponse() };
  }

  const proj = await getProjectById({ id });

  if (!proj) {
    return { error: new ChatSDKError("not_found:project").toResponse() };
  }

  if (proj.userId !== session.user.id) {
    return { error: new ChatSDKError("forbidden:project").toResponse() };
  }

  return { project: proj };
}

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
