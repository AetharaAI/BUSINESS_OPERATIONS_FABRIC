import { NextRequest, NextResponse } from "next/server";
import { safeRouteError } from "@/app/api/_lib/route-utils";
import { requireAdminSession } from "@/lib/server/admin-auth";
import { billingStateStore } from "@/lib/server/billing-state-store";
import { PlanSchema, TenantBillingStateListResponseSchema, TenantBillingStateUpdateSchema } from "@/lib/types/portal";

export async function GET(): Promise<NextResponse> {
  try {
    await requireAdminSession();
    const items = billingStateStore.list();
    return NextResponse.json(TenantBillingStateListResponseSchema.parse({ items }));
  } catch (error) {
    return safeRouteError(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdminSession();
    const body = (await request.json()) as { tenant_id?: string; tenant_name?: string; selected_plan?: string };

    if (!body.tenant_id) {
      return NextResponse.json({ error: "tenant_id is required" }, { status: 400 });
    }

    const parsedPlan = PlanSchema.safeParse(body.selected_plan ?? "starter");
    if (!parsedPlan.success) {
      return NextResponse.json({ error: "Invalid selected_plan" }, { status: 400 });
    }

    const state = billingStateStore.ensureForTenant({
      tenant_id: body.tenant_id,
      tenant_name: body.tenant_name,
      selected_plan: parsedPlan.data
    });
    return NextResponse.json(state);
  } catch (error) {
    return safeRouteError(error);
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdminSession();
    const parsed = TenantBillingStateUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
    }
    const updated = billingStateStore.update(parsed.data);
    return NextResponse.json(updated);
  } catch (error) {
    return safeRouteError(error);
  }
}
