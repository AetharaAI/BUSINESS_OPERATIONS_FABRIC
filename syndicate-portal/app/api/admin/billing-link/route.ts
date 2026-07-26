import { NextResponse } from "next/server";
import { safeRouteError } from "@/app/api/_lib/route-utils";
import { serverEnv } from "@/lib/server/env";
import { requireWorkforceSession } from "@/lib/server/admin-auth";

const buildManageUrl = (tenantId: string): string | null => {
  if (!serverEnv.portalBillingManageUrlTemplate) {
    return null;
  }

  return serverEnv.portalBillingManageUrlTemplate.replace("{tenant_id}", encodeURIComponent(tenantId));
};

export async function GET(): Promise<NextResponse> {
  try {
    const { me } = await requireWorkforceSession("tenant.onboarding.read_all");
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
