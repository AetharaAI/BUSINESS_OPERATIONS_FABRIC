import { NextResponse } from "next/server";
import { readSessionToken } from "@/lib/server/session";
import { voiceOpsRequest } from "@/lib/server/voiceops-client";
import { safeRouteError, unauthorized } from "@/app/api/_lib/route-utils";
import { SessionMeSchema } from "@/lib/types/portal";
import { unwrapVoiceOpsPayload } from "@/lib/server/response-shape";
import { isInternalAdminUser } from "@/lib/server/admin-auth";

export async function GET(): Promise<NextResponse> {
  try {
    const token = await readSessionToken();

    if (!token) {
      return unauthorized();
    }

    const payload = await voiceOpsRequest<unknown>({
      method: "GET",
      path: "/api/v1/auth/me",
      token
    });

    const unwrapped = unwrapVoiceOpsPayload(payload);
    const parsed = SessionMeSchema.safeParse(unwrapped);
    if (!parsed.success) {
      return NextResponse.json(unwrapped);
    }

    return NextResponse.json({
      ...parsed.data,
      is_internal_admin: isInternalAdminUser(parsed.data)
    });
  } catch (error) {
    return safeRouteError(error);
  }
}
