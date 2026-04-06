import { NextResponse } from "next/server";
import { readSessionToken } from "@/lib/server/session";
import { voiceOpsRequest } from "@/lib/server/voiceops-client";
import { safeRouteError, unauthorized } from "@/app/api/_lib/route-utils";
import { SessionMeSchema } from "@/lib/types/portal";

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

    const parsed = SessionMeSchema.safeParse(payload);
    return NextResponse.json(parsed.success ? parsed.data : payload);
  } catch (error) {
    return safeRouteError(error);
  }
}
