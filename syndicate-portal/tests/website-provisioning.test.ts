// @vitest-environment node

import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { SessionMe } from "@/lib/types/portal";

const resolveDatabaseUrl = (): string => {
  if (process.env.CRM_DATABASE_URL) {
    return process.env.CRM_DATABASE_URL;
  }

  const raw = execSync("docker inspect aether-postgres --format '{{json .Config.Env}}'", {
    encoding: "utf8"
  }).trim();
  const env = JSON.parse(raw) as string[];
  const passwordLine = env.find((line) => line.startsWith("SYNDICATE_DB_PASSWORD="));
  if (!passwordLine) {
    throw new Error("Unable to resolve SYNDICATE_DB_PASSWORD from aether-postgres");
  }

  const password = passwordLine.split("=")[1];
  return `postgresql://syndicate:${password}@127.0.0.1:5432/syndicate`;
};

let aiWebsiteProvisioningService: typeof import("@/lib/server/website-provisioning/service").aiWebsiteProvisioningService;
let billingStateStore: typeof import("@/lib/server/billing-state-store").billingStateStore;
let withCrmContext: typeof import("@/lib/server/crm/db-context").withCrmContext;
let getCrmPool: typeof import("@/lib/server/db/client").getCrmPool;
let schema: typeof import("@/lib/server/db/schema");

beforeAll(async () => {
  process.env.CRM_DATABASE_URL = resolveDatabaseUrl();
  process.env.REDWATCH_CLIENT_MODE = "memory";
  process.env.BOF_WORKSPACE_ID = process.env.BOF_WORKSPACE_ID || randomUUID();

  ({ aiWebsiteProvisioningService } = await import("@/lib/server/website-provisioning/service"));
  ({ billingStateStore } = await import("@/lib/server/billing-state-store"));
  ({ withCrmContext } = await import("@/lib/server/crm/db-context"));
  ({ getCrmPool } = await import("@/lib/server/db/client"));
  schema = await import("@/lib/server/db/schema");

  const pool = getCrmPool();
  await pool.query(`
    create table if not exists bof_crm.workforce_receipts (
      id uuid primary key default gen_random_uuid(),
      workspace_id uuid not null,
      tenant_id uuid not null,
      actor_id text,
      actor_type varchar(64) not null,
      actor_role text,
      action varchar(120) not null,
      target_type varchar(120) not null,
      target_id text,
      result varchar(64) not null,
      correlation_id uuid not null default gen_random_uuid(),
      payload jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  `);
});

const operatorSession: SessionMe = {
  user_id: randomUUID(),
  email: "ops@syndicateai.co",
  role: "admin",
  is_platform_admin: true,
  is_internal_admin: true,
  subject: "subject:ops",
  handle: "ops",
  workforce_role: "platform_admin",
  capability_scope: ["tenant.onboarding.update_all", "deal.create", "deal.stage.update", "audit.read_all"],
  tenant_scope_mode: "all",
  workspace_id: null,
  tenant_id: null,
  tenant_name: null
};

describe("AI website post-close provisioning", () => {
  it("creates the closed-won website handoff task and evidence trail for a paid tenant", async () => {
    const context = {
      workspace_id: randomUUID(),
      tenant_id: randomUUID()
    };

    billingStateStore.createOrReplaceForTenant({
      tenant_id: context.tenant_id,
      tenant_name: "Riverbend Electric",
      selected_plan: "starter",
      created_by_user_id: operatorSession.user_id,
      created_by_subject: operatorSession.subject,
      created_by_role: operatorSession.workforce_role,
      assigned_user_ids: [operatorSession.user_id!]
    });

    billingStateStore.applyStripeUpdate({
      tenant_id: context.tenant_id,
      deposit_status: "paid"
    });

    const summary = await aiWebsiteProvisioningService.upsert(context, operatorSession, {
      tenant_id: context.tenant_id,
      business_name: "Riverbend Electric",
      primary_contact_name: "Jamie Rivera",
      primary_contact_email: "jamie@riverbend.example.com",
      primary_contact_phone: "555-212-1000",
      deployment_family: "ai-website",
      offer_key: "ai_website_wedge",
      trigger_kind: "payment_confirmed",
      website_domain: "riverbend.example.com",
      website_objective: "Capture leads and route qualified visitors into follow-up.",
      promised_capabilities: ["lead capture", "ai chat", "crm handoff"],
      timeline_discussed: "Launch inside 7 business days",
      escalations_or_caveats: "Need logo files from client",
      payment_reference: "cs_test_ai_website_001",
      next_customer_action: "Send brand assets and preferred CTA copy",
      next_aetherpro_action: "Assign builder and open website provisioning circuit",
      accountable_owner: "ops"
    });

    expect(summary.business_name).toBe("Riverbend Electric");
    expect(summary.offer_key).toBe("ai_website_wedge");
    expect(summary.build_price_cents).toBe(19_700);
    expect(summary.monthly_price_cents).toBe(19_700);
    expect(summary.payment_state).toBe("paid");
    expect(summary.task_status).toBe("open");
    expect(summary.current_step).toBe("ready_for_provisioning");
    expect(summary.next_operator_action).toBe("Assign builder and open website provisioning circuit");
    expect(summary.latest_evidence.length).toBeGreaterThan(0);
    expect(summary.latest_evidence[0]?.action).toBe("website.provisioning.task.created");

    const updated = await aiWebsiteProvisioningService.updateStatus(context, operatorSession, {
      tenant_id: context.tenant_id,
      task_id: summary.task_id,
      task_status: "in_progress",
      current_step: "in_progress",
      next_operator_action: "Provisioning in progress: waiting on first draft review",
      operator_note: "Builder assigned and intake reviewed"
    });

    expect(updated.task_status).toBe("in_progress");
    expect(updated.current_step).toBe("in_progress");
    expect(updated.latest_evidence[0]?.action).toBe("website.provisioning.status.updated");

    await withCrmContext(context, async (tx) => {
      const companies = await tx.select().from(schema.companies);
      const contacts = await tx.select().from(schema.contacts);
      const deals = await tx.select().from(schema.deals);
      const tasks = await tx.select().from(schema.tasks);
      const receipts = await tx.select().from(schema.workforceReceipts);

      expect(companies.some((row) => row.id === summary.company_id && row.name === "Riverbend Electric")).toBe(true);
      expect(contacts.some((row) => row.id === summary.primary_contact_id && row.email === "jamie@riverbend.example.com")).toBe(true);
      expect(deals.some((row) => row.id === summary.deal_id && row.stage === "closed_won")).toBe(true);
      expect(tasks.some((row) => row.id === summary.task_id && row.title.includes("Provision AI Website"))).toBe(true);
      expect(receipts.some((row) => row.targetId === summary.task_id && row.action === "website.provisioning.task.created")).toBe(true);
      expect(receipts.some((row) => row.targetId === summary.task_id && row.action === "website.provisioning.status.updated")).toBe(true);
    });
  });

  it("reconciles a paid website build checkout into the existing provisioning task", async () => {
    const context = {
      workspace_id: randomUUID(),
      tenant_id: randomUUID()
    };

    billingStateStore.createOrReplaceForTenant({
      tenant_id: context.tenant_id,
      tenant_name: "Summit Solar",
      selected_plan: "starter",
      created_by_user_id: operatorSession.user_id,
      created_by_subject: operatorSession.subject,
      created_by_role: operatorSession.workforce_role,
      assigned_user_ids: [operatorSession.user_id!]
    });

    const blocked = await aiWebsiteProvisioningService.upsert(context, operatorSession, {
      tenant_id: context.tenant_id,
      business_name: "Summit Solar",
      primary_contact_name: "Maya Chen",
      primary_contact_email: "maya@summitsolar.example.com",
      primary_contact_phone: "555-313-2000",
      deployment_family: "ai-website",
      offer_key: "ai_website_wedge",
      trigger_kind: "confirmed_close",
      website_domain: "summitsolar.example.com",
      website_objective: "Book estimate calls and capture local service leads.",
      promised_capabilities: ["lead capture", "qualification"],
      next_aetherpro_action: "Confirm build payment before assigning builder."
    });

    expect(blocked.payment_state).toBe("pending");
    expect(blocked.task_status).toBe("blocked");
    expect(blocked.current_step).toBe("awaiting_payment");

    const reconciled = await aiWebsiteProvisioningService.markPaymentConfirmed(context, {
      payment_reference: "cs_test_website_build_paid_001",
      payment_kind: "build",
      operator_note: "Stripe build checkout completed."
    });

    expect(reconciled).not.toBeNull();
    expect(reconciled?.payment_state).toBe("paid");
    expect(reconciled?.trigger_kind).toBe("payment_confirmed");
    expect(reconciled?.payment_reference).toBe("cs_test_website_build_paid_001");
    expect(reconciled?.task_status).toBe("open");
    expect(reconciled?.current_step).toBe("ready_for_provisioning");
    expect(reconciled?.latest_evidence[0]?.action).toBe("website.payment.build.confirmed");
  });
});
