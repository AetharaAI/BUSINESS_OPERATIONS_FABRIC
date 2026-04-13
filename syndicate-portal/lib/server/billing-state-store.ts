import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Plan, TenantBillingState, TenantBillingStateUpdate } from "@/lib/types/portal";
import { loadStripePlanMappings } from "@/lib/server/stripe-plan-map";
import { mergeAgreementFields, normalizeAgreementFields } from "@/lib/shared/agreement-compat";

type BillingStateDatabaseV1 = {
  schema_version: 1;
  items: TenantBillingState[];
};

const DB_PATH = resolve(process.cwd(), "data", "tenant-billing-state.json");

const nowIso = (): string => new Date().toISOString();

const ensureDbFile = (): void => {
  if (existsSync(DB_PATH)) return;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const initial: BillingStateDatabaseV1 = { schema_version: 1, items: [] };
  writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
};

const readDb = (): BillingStateDatabaseV1 => {
  ensureDbFile();
  const raw = JSON.parse(readFileSync(DB_PATH, "utf8")) as Partial<BillingStateDatabaseV1>;
  const schemaVersion = raw.schema_version ?? 1;
  const items = Array.isArray(raw.items)
    ? (raw.items as TenantBillingState[]).map((item) => normalizeAgreementFields(item))
    : [];
  return { schema_version: schemaVersion as 1, items };
};

const writeDb = (db: BillingStateDatabaseV1): void => {
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
};

const buildPlanDefaults = (plan: Plan) => {
  const mappings = loadStripePlanMappings();
  return mappings[plan];
};

const createDefaultState = (tenantId: string, tenantName: string | null, plan: Plan): TenantBillingState => {
  const defaults = buildPlanDefaults(plan);
  return {
    tenant_id: tenantId,
    tenant_name: tenantName,
    selected_plan: plan,
    agreement_status: "draft",
    deposit_status: "pending",
    final_setup_status: defaults.final_setup_status_default,
    monthly_status: "inactive",
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_product_id_reference: defaults.stripe_product_id_reference,
    stripe_price_id_deposit: defaults.stripe_price_id_deposit,
    stripe_price_id_final_setup: defaults.stripe_price_id_final_setup,
    stripe_price_id_monthly: defaults.stripe_price_id_monthly,
    payment_link_deposit: defaults.payment_link_deposit,
    payment_link_final_setup: defaults.payment_link_final_setup,
    agreement_provider: null,
    agreement_provider_document_id: null,
    agreement_number: null,
    agreement_signed_at: null,
    docusign_envelope_id: null,
    portal_invite_status: "not_sent",
    onboarding_notes: null,
    updated_at: nowIso()
  };
};

const applyPlanMapping = (current: TenantBillingState, plan: Plan): TenantBillingState => {
  const defaults = buildPlanDefaults(plan);
  return {
    ...current,
    selected_plan: plan,
    stripe_product_id_reference: defaults.stripe_product_id_reference,
    stripe_price_id_deposit: defaults.stripe_price_id_deposit,
    stripe_price_id_final_setup: defaults.stripe_price_id_final_setup,
    stripe_price_id_monthly: defaults.stripe_price_id_monthly,
    payment_link_deposit: defaults.payment_link_deposit,
    payment_link_final_setup: defaults.payment_link_final_setup,
    final_setup_status: defaults.final_setup_status_default
  };
};

export const billingStateStore = {
  list(): TenantBillingState[] {
    return readDb().items.sort((a, b) => a.tenant_id.localeCompare(b.tenant_id));
  },

  getByTenantId(tenantId: string): TenantBillingState | null {
    return readDb().items.find((item) => item.tenant_id === tenantId) ?? null;
  },

  findByStripeCustomerId(customerId: string): TenantBillingState | null {
    return readDb().items.find((item) => item.stripe_customer_id === customerId) ?? null;
  },

  findCandidatesByPriceId(priceId: string): TenantBillingState[] {
    return readDb().items.filter(
      (item) =>
        item.stripe_price_id_deposit === priceId ||
        item.stripe_price_id_final_setup === priceId ||
        item.stripe_price_id_monthly === priceId
    );
  },

  createOrReplaceForTenant(params: { tenant_id: string; tenant_name?: string | null; selected_plan: Plan }): TenantBillingState {
    const db = readDb();
    const next = createDefaultState(params.tenant_id, params.tenant_name ?? null, params.selected_plan);
    const idx = db.items.findIndex((item) => item.tenant_id === params.tenant_id);
    if (idx >= 0) db.items[idx] = next;
    else db.items.push(next);
    writeDb(db);
    return next;
  },

  ensureForTenant(params: { tenant_id: string; tenant_name?: string | null; selected_plan?: Plan }): TenantBillingState {
    const existing = this.getByTenantId(params.tenant_id);
    if (existing) return existing;
    return this.createOrReplaceForTenant({
      tenant_id: params.tenant_id,
      tenant_name: params.tenant_name ?? null,
      selected_plan: params.selected_plan ?? "starter"
    });
  },

  update(update: TenantBillingStateUpdate): TenantBillingState {
    const db = readDb();
    const idx = db.items.findIndex((item) => item.tenant_id === update.tenant_id);
    if (idx < 0) {
      throw new Error(`No billing state found for tenant ${update.tenant_id}`);
    }

    let current = db.items[idx];
    if (update.selected_plan) {
      current = applyPlanMapping(current, update.selected_plan);
    }

    const next: TenantBillingState = normalizeAgreementFields({
      ...current,
      ...update,
      ...mergeAgreementFields(current, update),
      tenant_name: update.tenant_name === undefined ? current.tenant_name : update.tenant_name,
      updated_at: nowIso()
    });

    db.items[idx] = next;
    writeDb(db);
    return next;
  },

  applyStripeUpdate(params: {
    tenant_id: string;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    deposit_status?: "pending" | "paid";
    final_setup_status?: "pending" | "paid" | "not_required";
    monthly_status?: "inactive" | "pending" | "active";
  }): TenantBillingState {
    return this.update({
      tenant_id: params.tenant_id,
      stripe_customer_id: params.stripe_customer_id ?? undefined,
      stripe_subscription_id: params.stripe_subscription_id ?? undefined,
      deposit_status: params.deposit_status,
      final_setup_status: params.final_setup_status,
      monthly_status: params.monthly_status
    });
  }
};
