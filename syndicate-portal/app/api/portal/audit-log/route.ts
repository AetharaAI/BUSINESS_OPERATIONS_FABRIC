import { NextRequest, NextResponse } from "next/server";
import { readSessionToken } from "@/lib/server/session";
import { voiceOpsRequest } from "@/lib/server/voiceops-client";
import { PortalAuditLogResponseSchema } from "@/lib/types/portal";
import { safeRouteError, unauthorized } from "@/app/api/_lib/route-utils";
import { unwrapVoiceOpsPayload } from "@/lib/server/response-shape";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const token = await readSessionToken();

    if (!token) {
      return unauthorized();
    }

    const search = request.nextUrl.searchParams;
    const limit = search.get("limit");
    const since = search.get("since");
    const actor = search.get("actor");
    const eventType = search.get("event_type");

    const voiceOpsParams = new URLSearchParams();
    if (limit) voiceOpsParams.set("limit", limit);
    if (since) voiceOpsParams.set("since", since);
    if (actor) voiceOpsParams.set("actor", actor);
    if (eventType) voiceOpsParams.set("event_type", eventType);

    const path = `/api/v1/portal/audit-log${
      voiceOpsParams.toString() ? `?${voiceOpsParams.toString()}` : ""
    }`;

    const payload = await voiceOpsRequest<unknown>({
      method: "GET",
      path,
      token
    });

    const parsed = PortalAuditLogResponseSchema.safeParse(unwrapVoiceOpsPayload(payload));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid audit log response from VoiceOps", details: parsed.error.flatten() },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed.data);
  } catch (error) {
    return safeRouteError(error);
  }
}
