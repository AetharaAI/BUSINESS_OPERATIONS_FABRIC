import { NextRequest, NextResponse } from "next/server";
import { safeRouteError } from "@/app/api/_lib/route-utils";
import { requireWorkforceSession } from "@/lib/server/admin-auth";
import { billingStateStore } from "@/lib/server/billing-state-store";
import { resolveCrmRequestContext } from "@/lib/server/crm/request-context";
import { serverEnv } from "@/lib/server/env";
import { resolveWebsiteOfferCatalog } from "@/lib/server/website-provisioning/catalog";
import { aiWebsiteProvisioningService } from "@/lib/server/website-provisioning/service";
import { canAccessTenantState } from "@/lib/shared/workforce-auth";
import {
  WebsiteProvisioningStatusUpdateSchema,
  WebsiteProvisioningUpsertRequestSchema
} from "@/lib/types/website-provisioning";

const resolveTenantContext = (tenantId: string, workspaceId: string, me: Awaited<ReturnType<typeof requireWorkforceSession>>["me"]) => {
  const state = billingStateStore.getByTenantId(tenantId);
  if (!state) {
    throw new Error("Not found");
  }

  if (!canAccessTenantState(me, state)) {
    throw new Error("Forbidden");
  }

  return resolveCrmRequestContext(
    {
      workspace_id: workspaceId,
      tenant_id: tenantId
    },
    me
  );
};

const requireWorkspaceId = (sessionWorkspaceId: string | null | undefined): string => {
  const workspaceId = sessionWorkspaceId ?? serverEnv.bofWorkspaceId;
  if (!workspaceId) {
    throw new Error("Missing BOF workspace context");
  }

  return workspaceId;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { me } = await requireWorkforceSession(["tenant.onboarding.read_all", "tenant.onboarding.read_own"]);
    const tenantId = request.nextUrl.searchParams.get("tenant_id");

    if (!tenantId) {
      return NextResponse.json({ error: "tenant_id is required" }, { status: 400 });
    }

    const context = resolveTenantContext(tenantId, requireWorkspaceId(me.workspace_id), me);
    const item = await aiWebsiteProvisioningService.getByTenant(context);
    return NextResponse.json({ item, catalog: resolveWebsiteOfferCatalog() });
  } catch (error) {
    return safeRouteError(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { me } = await requireWorkforceSession(["tenant.onboarding.update_all", "tenant.onboarding.update_own"]);
    const parsed = WebsiteProvisioningUpsertRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
    }

    const context = resolveTenantContext(parsed.data.tenant_id, requireWorkspaceId(me.workspace_id), me);
    const item = await aiWebsiteProvisioningService.upsert(context, me, parsed.data);
    return NextResponse.json(item);
  } catch (error) {
    return safeRouteError(error);
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const { me } = await requireWorkforceSession(["tenant.onboarding.update_all", "tenant.onboarding.update_own"]);
    const parsed = WebsiteProvisioningStatusUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
    }

    const context = resolveTenantContext(parsed.data.tenant_id, requireWorkspaceId(me.workspace_id), me);
    const item = await aiWebsiteProvisioningService.updateStatus(context, me, parsed.data);
    return NextResponse.json(item);
  } catch (error) {
    return safeRouteError(error);
  }
}
