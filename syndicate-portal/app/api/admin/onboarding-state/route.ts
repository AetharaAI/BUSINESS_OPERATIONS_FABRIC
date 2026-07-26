import { NextRequest, NextResponse } from "next/server";
import { safeRouteError } from "@/app/api/_lib/route-utils";
import { requireWorkforceSession } from "@/lib/server/admin-auth";
import { billingStateStore } from "@/lib/server/billing-state-store";
import { PlanSchema, TenantBillingStateListResponseSchema, TenantBillingStateUpdateSchema } from "@/lib/types/portal";
import { canAccessTenantState, canManageOnboardingOperations } from "@/lib/shared/workforce-auth";

const SALES_REP_RESTRICTED_UPDATE_FIELDS = [
  "agreement_status",
  "deposit_status",
  "final_setup_status",
  "monthly_status",
  "stripe_customer_id",
  "stripe_subscription_id",
  "stripe_product_id_reference",
  "stripe_price_id_deposit",
  "stripe_price_id_final_setup",
  "stripe_price_id_monthly",
  "payment_link_deposit",
  "payment_link_final_setup",
  "agreement_provider",
  "agreement_provider_document_id",
  "agreement_number",
  "agreement_signed_at",
  "docusign_envelope_id"
] as const;

export async function GET(): Promise<NextResponse> {
  try {
    const { me } = await requireWorkforceSession(["tenant.onboarding.read_all", "tenant.onboarding.read_own"]);
    const items = billingStateStore.list().filter((item) => canAccessTenantState(me, item));
    return NextResponse.json(TenantBillingStateListResponseSchema.parse({ items }));
  } catch (error) {
    return safeRouteError(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { me } = await requireWorkforceSession("tenant.create");
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
      selected_plan: parsedPlan.data,
      created_by_user_id: me.user_id ?? null,
      created_by_subject: me.subject ?? me.email ?? null,
      created_by_role: me.workforce_role ?? me.role ?? "customer",
      sales_rep_id: me.workforce_role === "internal_sales_rep" ? me.user_id ?? null : null,
      sales_rep_email: me.workforce_role === "internal_sales_rep" ? me.email ?? null : null,
      sales_rep_handle: me.workforce_role === "internal_sales_rep" ? me.handle ?? null : null,
      attribution_source: me.workforce_role === "internal_sales_rep" ? "internal_sales_rep_portal" : "internal_workforce_portal",
      created_at: new Date().toISOString(),
      onboarding_status: "draft",
      approval_status: me.workforce_role === "internal_sales_rep" ? "pending_internal_review" : "approved",
      audit_correlation_id: crypto.randomUUID(),
      assigned_user_ids: me.user_id ? [me.user_id] : []
    });
    return NextResponse.json(state);
  } catch (error) {
    return safeRouteError(error);
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const { me } = await requireWorkforceSession(["tenant.onboarding.update_all", "tenant.onboarding.update_own"]);
    const parsed = TenantBillingStateUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
    }
    const existing = billingStateStore.getByTenantId(parsed.data.tenant_id);
    if (!existing) {
      return NextResponse.json({ error: `No billing state found for tenant ${parsed.data.tenant_id}` }, { status: 404 });
    }
    if (!canAccessTenantState(me, existing)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!canManageOnboardingOperations(me)) {
      const attemptedRestrictedField = SALES_REP_RESTRICTED_UPDATE_FIELDS.find(
        (field) => parsed.data[field] !== undefined
      );
      if (attemptedRestrictedField) {
        return NextResponse.json(
          { error: `Forbidden: field '${attemptedRestrictedField}' requires operator approval` },
          { status: 403 }
        );
      }
    }

    const updated = billingStateStore.update(parsed.data);
    return NextResponse.json(updated);
  } catch (error) {
    return safeRouteError(error);
  }
}
