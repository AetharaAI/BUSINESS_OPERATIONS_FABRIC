import { NextResponse } from "next/server";
import { safeRouteError, unauthorized } from "@/app/api/_lib/route-utils";
import { readSessionToken } from "@/lib/server/session";
import { voiceOpsRequest } from "@/lib/server/voiceops-client";
import { SessionMeSchema } from "@/lib/types/portal";
import { serverEnv } from "@/lib/server/env";
import { unwrapVoiceOpsPayload } from "@/lib/server/response-shape";

const buildManageUrl = (tenantId: string): string | null => {
  if (!serverEnv.portalBillingManageUrlTemplate) {
    return null;
  }

  return serverEnv.portalBillingManageUrlTemplate.replace("{tenant_id}", encodeURIComponent(tenantId));
};

export async function GET(): Promise<NextResponse> {
  try {
    const token = await readSessionToken();
    if (!token) {
      return unauthorized();
    }

    const mePayload = await voiceOpsRequest<unknown>({
      method: "GET",
      path: "/api/v1/auth/me",
      token
    });
    const me = SessionMeSchema.parse(unwrapVoiceOpsPayload(mePayload));
    const tenantId = me.tenant_id || "";

    const manageUrl = tenantId ? buildManageUrl(tenantId) : null;
    return NextResponse.json({
      status: manageUrl ? "configured" : "not_configured",
      provider: serverEnv.portalBillingProvider,
      manage_url: manageUrl
    });
  } catch (error) {
    return safeRouteError(error);
  }
}

