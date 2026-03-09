import { getSession } from "@/lib/auth";
import { createProject, getProjectsByUserId } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { createProjectSchema } from "./schema";

export async function GET() {
  const session = await getSession();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:project").toResponse();
  }

  const projects = await getProjectsByUserId({ userId: session.user.id });
  return Response.json(projects);
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:project").toResponse();
  }

  try {
    const json = await request.json();
    const { name } = createProjectSchema.parse(json);
    const created = await createProject({ name, userId: session.user.id });
    return Response.json(created, { status: 201 });
  } catch (_error) {
    return new ChatSDKError("bad_request:project").toResponse();
  }
}
