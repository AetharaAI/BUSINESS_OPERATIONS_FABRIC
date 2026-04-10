import { NextResponse } from "next/server";
import { readSessionToken } from "@/lib/server/session";
import { voiceOpsRequest } from "@/lib/server/voiceops-client";
import { safeRouteError, unauthorized } from "@/app/api/_lib/route-utils";
import { SessionMeSchema } from "@/lib/types/portal";
import { unwrapVoiceOpsPayload } from "@/lib/server/response-shape";
import { isInternalAdmin } from "@/lib/shared/internal-admin";

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
      console.error("[portal-authz] malformed session payload", {
        details: parsed.error.flatten()
      });
      return NextResponse.json({ error: "Invalid session payload" }, { status: 502 });
    }

    if (!parsed.data.email || typeof parsed.data.email !== "string") {
      console.error("[portal-authz] malformed session payload: missing email", {
        email: parsed.data.email ?? null,
        role: parsed.data.role ?? null,
        is_platform_admin: parsed.data.is_platform_admin ?? null
      });
      return NextResponse.json({ error: "Invalid session payload" }, { status: 502 });
    }

    const adminAccess = isInternalAdmin(parsed.data);
    console.info("[portal-authz] session resolved", {
      email: parsed.data.email ?? null,
      role: parsed.data.role ?? null,
      is_platform_admin: parsed.data.is_platform_admin ?? null,
      isInternalAdmin: adminAccess
    });

    return NextResponse.json({
      ...parsed.data,
      is_internal_admin: adminAccess
    });
  } catch (error) {
    return safeRouteError(error);
  }
}
