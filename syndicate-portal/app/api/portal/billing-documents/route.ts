import { NextResponse } from "next/server";
import { safeRouteError, unauthorized } from "@/app/api/_lib/route-utils";
import { readSessionToken } from "@/lib/server/session";
import { voiceOpsRequest } from "@/lib/server/voiceops-client";
import { SessionMeSchema } from "@/lib/types/portal";
import { billingStateStore } from "@/lib/server/billing-state-store";
import { unwrapVoiceOpsPayload } from "@/lib/server/response-shape";

export async function GET(): Promise<NextResponse> {
  try {
    const token = await readSessionToken();
    if (!token) return unauthorized();

    const mePayload = await voiceOpsRequest<unknown>({
      method: "GET",
      path: "/api/v1/auth/me",
      token
    });
    const me = SessionMeSchema.parse(unwrapVoiceOpsPayload(mePayload));
    if (!me.tenant_id) {
      return NextResponse.json({ error: "No tenant context" }, { status: 400 });
    }

    const state = billingStateStore.ensureForTenant({
      tenant_id: me.tenant_id,
      tenant_name: me.tenant_name
    });

    return NextResponse.json({
      ...state,
      signed_documents: [],
      invoices: []
    });
  } catch (error) {
    return safeRouteError(error);
  }
}
