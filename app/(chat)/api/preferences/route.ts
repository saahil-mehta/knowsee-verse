import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getUserPreferences, markTourSeen } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

const PreferencesSchema = z.object({
  hasSeenTour: z.literal(true).optional(),
});

export async function GET() {
  const session = await getSession();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:auth").toResponse();
  }

  const prefs = await getUserPreferences({ userId: session.user.id });
  return Response.json(prefs, { status: 200 });
}

export async function PATCH(request: Request) {
  const session = await getSession();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:auth").toResponse();
  }

  const parsed = PreferencesSchema.safeParse(await request.json());

  if (!parsed.success) {
    return new ChatSDKError(
      "bad_request:api",
      "Preferences payload is invalid."
    ).toResponse();
  }

  if (parsed.data.hasSeenTour) {
    await markTourSeen({ userId: session.user.id });
  }

  return new Response("ok", { status: 200 });
}
