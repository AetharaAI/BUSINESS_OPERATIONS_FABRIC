import { NextResponse } from "next/server";
import { readSessionToken } from "@/lib/server/session";
import { voiceOpsRequest } from "@/lib/server/voiceops-client";
import { PortalDashboardSchema } from "@/lib/types/portal";
import { safeRouteError, unauthorized } from "@/app/api/_lib/route-utils";
import { unwrapVoiceOpsPayload } from "@/lib/server/response-shape";

export async function GET(): Promise<NextResponse> {
  try {
    const token = await readSessionToken();

    if (!token) {
      return unauthorized();
    }

    const payload = await voiceOpsRequest<unknown>({
      method: "GET",
      path: "/api/v1/portal/dashboard",
      token
    });

    const parsed = PortalDashboardSchema.safeParse(unwrapVoiceOpsPayload(payload));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid dashboard response from VoiceOps", details: parsed.error.flatten() },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed.data);
  } catch (error) {
    return safeRouteError(error);
  }
}
