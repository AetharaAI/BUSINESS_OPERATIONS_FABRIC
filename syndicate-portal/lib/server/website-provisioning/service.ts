import crypto from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { withCrmContext, type CrmTx } from "@/lib/server/crm/db-context";
import { companies, contacts, deals, tasks, workforceReceipts } from "@/lib/server/db/schema";
import { billingStateStore } from "@/lib/server/billing-state-store";
import { emitWorkforceReceipt } from "@/lib/server/workforce/receipts";
import { type CrmRequestContext } from "@/lib/server/crm/request-context";
import { type SessionMe } from "@/lib/types/portal";
import {
  type AiWebsiteOfferKey,
  type WebsiteProvisioningStep,
  type WebsiteProvisioningStatusUpdateRequest,
  type WebsiteProvisioningSummary,
  type WebsiteProvisioningTaskStatus,
  type WebsiteProvisioningUpsertRequest
} from "@/lib/types/website-provisioning";

const TASK_SCHEMA = "bof.ai_website_provisioning.v1";
const TASK_MARKER = "[bof:ai-website-provisioning]";

const AI_WEBSITE_OFFERS: Record<
  AiWebsiteOfferKey,
  { label: string; buildPriceCents: number; monthlyPriceCents: number }
> = {
  ai_website_wedge: {
    label: "AI Website Wedge",
    buildPriceCents: 19_700,
    monthlyPriceCents: 19_700
  }
};

type WebsiteTaskPayload = {
  schema: typeof TASK_SCHEMA;
  version: 1;
  tenant_id: string;
  company_id: string;
  primary_contact_id: string;
  deal_id: string;
  task_id?: string;
  business_name: string;
  primary_contact_name: string;
  primary_contact_email: string;
  primary_contact_phone: string;
  deployment_family: "ai-website";
  offer_key: AiWebsiteOfferKey;
  offer_label: string;
  build_price_cents: number;
  monthly_price_cents: number;
  trigger_kind: "confirmed_close" | "payment_confirmed";
  payment_state: "pending" | "paid";
  task_status: WebsiteProvisioningTaskStatus;
  current_step: WebsiteProvisioningStep;
  next_operator_action: string;
  website_domain: string | null;
  website_objective: string | null;
  promised_capabilities: string[];
  timeline_discussed: string | null;
  escalations_or_caveats: string | null;
  payment_reference: string | null;
  next_customer_action: string | null;
  next_aetherpro_action: string | null;
  accountable_owner: string | null;
  created_at: string;
  updated_at: string;
};

const actor = (session: SessionMe) => ({
  userId: session.user_id ?? null,
  subject: session.subject ?? session.email ?? null,
  role: session.workforce_role ?? session.role ?? "customer"
});

const normalizeCapabilities = (values: string[]): string[] =>
  [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];

const derivePaymentState = (params: {
  tenantId: string;
  triggerKind: "confirmed_close" | "payment_confirmed";
  paymentReference?: string;
}): "pending" | "paid" => {
  const billing = billingStateStore.getByTenantId(params.tenantId);
  const hasPaidBillingState =
    billing?.deposit_status === "paid" || billing?.final_setup_status === "paid" || billing?.monthly_status === "active";

  if (params.triggerKind === "payment_confirmed") {
    if (!hasPaidBillingState && !params.paymentReference) {
      throw new Error("Payment-confirmed provisioning requires a paid billing state or payment reference.");
    }

    return "paid";
  }

  return hasPaidBillingState ? "paid" : "pending";
};

const deriveTaskState = (params: {
  paymentState: "pending" | "paid";
  nextAetherproAction?: string;
}): { taskStatus: WebsiteProvisioningTaskStatus; currentStep: WebsiteProvisioningStep; nextOperatorAction: string } => {
  if (params.paymentState === "paid") {
    return {
      taskStatus: "open",
      currentStep: "ready_for_provisioning",
      nextOperatorAction:
        params.nextAetherproAction?.trim() || "Review website intake, assign builder, and start provisioning."
    };
  }

  return {
    taskStatus: "blocked",
    currentStep: "awaiting_payment",
    nextOperatorAction:
      params.nextAetherproAction?.trim() || "Confirm payment before website provisioning begins."
  };
};

const renderTaskNotes = (payload: WebsiteTaskPayload): string =>
  `${TASK_MARKER}
${JSON.stringify(payload, null, 2)}`;

const parseTaskNotes = (notes: string | null): WebsiteTaskPayload | null => {
  if (!notes || !notes.startsWith(TASK_MARKER)) {
    return null;
  }

  const jsonStart = notes.indexOf("{");
  if (jsonStart < 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(notes.slice(jsonStart)) as WebsiteTaskPayload;
    return parsed.schema === TASK_SCHEMA ? parsed : null;
  } catch {
    return null;
  }
};

const getExistingCompany = async (tx: CrmTx, context: CrmRequestContext, businessName: string) => {
  const [existing] = await tx
    .select()
    .from(companies)
    .where(and(eq(companies.tenantId, context.tenant_id), eq(companies.name, businessName)))
    .limit(1);

  return existing ?? null;
};

const getExistingContact = async (tx: CrmTx, context: CrmRequestContext, email: string) => {
  const [existing] = await tx
    .select()
    .from(contacts)
    .where(and(eq(contacts.tenantId, context.tenant_id), eq(contacts.email, email)))
    .limit(1);

  return existing ?? null;
};

const getExistingProvisioningTask = async (tx: CrmTx, context: CrmRequestContext) => {
  const rows = await tx
    .select()
    .from(tasks)
    .where(eq(tasks.tenantId, context.tenant_id))
    .orderBy(desc(tasks.createdAt));

  for (const row of rows) {
    const parsed = parseTaskNotes(row.notes ?? null);
    if (parsed) {
      return { row, parsed };
    }
  }

  return null;
};

const getExistingDeal = async (tx: CrmTx, context: CrmRequestContext, name: string) => {
  const [existing] = await tx
    .select()
    .from(deals)
    .where(and(eq(deals.tenantId, context.tenant_id), eq(deals.name, name)))
    .limit(1);

  return existing ?? null;
};

const toSummary = async (tx: CrmTx, context: CrmRequestContext, taskId: string): Promise<WebsiteProvisioningSummary> => {
  const [task] = await tx
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.tenantId, context.tenant_id)))
    .limit(1);

  if (!task) {
    throw new Error("Website provisioning task not found");
  }

  const parsed = parseTaskNotes(task.notes ?? null);
  if (!parsed) {
    throw new Error("Website provisioning task payload is missing");
  }

  const receipts = await tx
    .select({
      id: workforceReceipts.id,
      action: workforceReceipts.action,
      result: workforceReceipts.result,
      createdAt: workforceReceipts.createdAt
    })
    .from(workforceReceipts)
    .where(and(eq(workforceReceipts.tenantId, context.tenant_id), eq(workforceReceipts.targetId, taskId)))
    .orderBy(desc(workforceReceipts.createdAt));

  return {
    tenant_id: parsed.tenant_id,
    company_id: parsed.company_id,
    primary_contact_id: parsed.primary_contact_id,
    deal_id: parsed.deal_id,
    task_id: task.id,
    business_name: parsed.business_name,
    primary_contact_name: parsed.primary_contact_name,
    primary_contact_email: parsed.primary_contact_email,
    primary_contact_phone: parsed.primary_contact_phone,
    deployment_family: parsed.deployment_family,
    offer_key: parsed.offer_key,
    offer_label: parsed.offer_label,
    build_price_cents: parsed.build_price_cents,
    monthly_price_cents: parsed.monthly_price_cents,
    trigger_kind: parsed.trigger_kind,
    payment_state: parsed.payment_state,
    task_status: parsed.task_status,
    current_step: parsed.current_step,
    next_operator_action: parsed.next_operator_action,
    website_domain: parsed.website_domain,
    website_objective: parsed.website_objective,
    promised_capabilities: parsed.promised_capabilities,
    timeline_discussed: parsed.timeline_discussed,
    escalations_or_caveats: parsed.escalations_or_caveats,
    payment_reference: parsed.payment_reference,
    next_customer_action: parsed.next_customer_action,
    next_aetherpro_action: parsed.next_aetherpro_action,
    accountable_owner: parsed.accountable_owner,
    created_at: parsed.created_at,
    updated_at: parsed.updated_at,
    latest_evidence: receipts.map((receipt) => ({
      id: receipt.id,
      action: receipt.action,
      result: receipt.result,
      created_at: receipt.createdAt.toISOString()
    }))
  };
};

export const aiWebsiteProvisioningService = {
  getByTenant: async (context: CrmRequestContext): Promise<WebsiteProvisioningSummary | null> =>
    withCrmContext(context, async (tx) => {
      const existing = await getExistingProvisioningTask(tx, context);
      if (!existing) {
        return null;
      }

      return toSummary(tx, context, existing.row.id);
    }),

  upsert: async (
    context: CrmRequestContext,
    session: SessionMe,
    input: WebsiteProvisioningUpsertRequest
  ): Promise<WebsiteProvisioningSummary> =>
    withCrmContext(context, async (tx) => {
      const offer = AI_WEBSITE_OFFERS[input.offer_key];
      const paymentState = derivePaymentState({
        tenantId: input.tenant_id,
        triggerKind: input.trigger_kind,
        paymentReference: input.payment_reference
      });
      const derivedTask = deriveTaskState({
        paymentState,
        nextAetherproAction: input.next_aetherpro_action
      });
      const actorInfo = actor(session);
      const now = new Date().toISOString();

      const existingCompany = await getExistingCompany(tx, context, input.business_name);
      const company =
        existingCompany ??
        (
          await tx
            .insert(companies)
            .values({
              workspaceId: context.workspace_id,
              tenantId: context.tenant_id,
              name: input.business_name,
              website: input.website_domain ?? null,
              notes: input.website_objective ?? null,
              createdByUserId: actorInfo.userId,
              createdBySubject: actorInfo.subject,
              createdByRole: actorInfo.role
            })
            .returning()
        )[0];

      const [updatedCompany] =
        existingCompany && input.website_domain && existingCompany.website !== input.website_domain
          ? await tx
              .update(companies)
              .set({
                website: input.website_domain,
                notes: input.website_objective ?? existingCompany.notes,
                updatedAt: new Date()
              })
              .where(eq(companies.id, existingCompany.id))
              .returning()
          : [company];

      const existingContact = await getExistingContact(tx, context, input.primary_contact_email);
      const [firstName, ...restName] = input.primary_contact_name.trim().split(/\s+/);
      const lastName = restName.join(" ") || "Contact";
      const contact =
        existingContact ??
        (
          await tx
            .insert(contacts)
            .values({
              workspaceId: context.workspace_id,
              tenantId: context.tenant_id,
              companyId: updatedCompany.id,
              firstName,
              lastName,
              email: input.primary_contact_email,
              phone: input.primary_contact_phone,
              notes: input.escalations_or_caveats ?? null,
              createdByUserId: actorInfo.userId,
              createdBySubject: actorInfo.subject,
              createdByRole: actorInfo.role
            })
            .returning()
        )[0];

      const [updatedContact] =
        existingContact &&
        (existingContact.phone !== input.primary_contact_phone || existingContact.companyId !== updatedCompany.id)
          ? await tx
              .update(contacts)
              .set({
                companyId: updatedCompany.id,
                phone: input.primary_contact_phone,
                notes: input.escalations_or_caveats ?? existingContact.notes,
                updatedAt: new Date()
              })
              .where(eq(contacts.id, existingContact.id))
              .returning()
          : [contact];

      const dealName = `${input.business_name} — ${offer.label}`;
      const existingDeal = await getExistingDeal(tx, context, dealName);
      const dealAmountCents = offer.buildPriceCents;
      const dealNotes = [
        `deployment_family=${input.deployment_family}`,
        `offer_key=${input.offer_key}`,
        `payment_state=${paymentState}`,
        input.timeline_discussed ? `timeline=${input.timeline_discussed}` : null,
        input.escalations_or_caveats ? `caveats=${input.escalations_or_caveats}` : null
      ]
        .filter((value): value is string => Boolean(value))
        .join("\n");

      const deal =
        existingDeal ??
        (
          await tx
            .insert(deals)
            .values({
              workspaceId: context.workspace_id,
              tenantId: context.tenant_id,
              companyId: updatedCompany.id,
              primaryContactId: updatedContact.id,
              name: dealName,
              stage: "closed_won",
              amountCents: dealAmountCents,
              currency: "USD",
              notes: dealNotes,
              createdByUserId: actorInfo.userId,
              createdBySubject: actorInfo.subject,
              createdByRole: actorInfo.role
            })
            .returning()
        )[0];

      const [updatedDeal] =
        existingDeal
          ? await tx
              .update(deals)
              .set({
                companyId: updatedCompany.id,
                primaryContactId: updatedContact.id,
                stage: "closed_won",
                amountCents: dealAmountCents,
                notes: dealNotes,
                updatedAt: new Date()
              })
              .where(eq(deals.id, existingDeal.id))
              .returning()
          : [deal];

      const existingTask = await getExistingProvisioningTask(tx, context);
      const taskPayload: WebsiteTaskPayload = {
        schema: TASK_SCHEMA,
        version: 1,
        tenant_id: input.tenant_id,
        company_id: updatedCompany.id,
        primary_contact_id: updatedContact.id,
        deal_id: updatedDeal.id,
        task_id: existingTask?.row.id,
        business_name: input.business_name,
        primary_contact_name: input.primary_contact_name,
        primary_contact_email: input.primary_contact_email,
        primary_contact_phone: input.primary_contact_phone,
        deployment_family: input.deployment_family,
        offer_key: input.offer_key,
        offer_label: offer.label,
        build_price_cents: offer.buildPriceCents,
        monthly_price_cents: offer.monthlyPriceCents,
        trigger_kind: input.trigger_kind,
        payment_state: paymentState,
        task_status: derivedTask.taskStatus,
        current_step: derivedTask.currentStep,
        next_operator_action: derivedTask.nextOperatorAction,
        website_domain: input.website_domain ?? null,
        website_objective: input.website_objective ?? null,
        promised_capabilities: normalizeCapabilities(input.promised_capabilities),
        timeline_discussed: input.timeline_discussed ?? null,
        escalations_or_caveats: input.escalations_or_caveats ?? null,
        payment_reference: input.payment_reference ?? null,
        next_customer_action: input.next_customer_action ?? null,
        next_aetherpro_action: input.next_aetherpro_action ?? null,
        accountable_owner: input.accountable_owner ?? null,
        created_at: existingTask?.parsed.created_at ?? now,
        updated_at: now
      };

      const [savedTask] =
        existingTask
          ? await tx
              .update(tasks)
              .set({
                dealId: updatedDeal.id,
                title: `Provision AI Website — ${input.business_name}`,
                status: taskPayload.task_status,
                notes: renderTaskNotes(taskPayload),
                assignedToUserId: actorInfo.userId,
                updatedAt: new Date()
              })
              .where(eq(tasks.id, existingTask.row.id))
              .returning()
          : await tx
              .insert(tasks)
              .values({
                workspaceId: context.workspace_id,
                tenantId: context.tenant_id,
                dealId: updatedDeal.id,
                title: `Provision AI Website — ${input.business_name}`,
                status: taskPayload.task_status,
                assignedToUserId: actorInfo.userId,
                notes: renderTaskNotes(taskPayload),
                createdByUserId: actorInfo.userId,
                createdBySubject: actorInfo.subject,
                createdByRole: actorInfo.role
              })
              .returning();

      await emitWorkforceReceipt({
        tx,
        workspaceId: context.workspace_id,
        tenantId: context.tenant_id,
        session,
        actorType: "human",
        action: existingTask ? "website.provisioning.task.updated" : "website.provisioning.task.created",
        targetType: "crm_task",
        targetId: savedTask.id,
        result: "success",
        correlationId: crypto.randomUUID(),
        payload: {
          schema: TASK_SCHEMA,
          trigger_kind: taskPayload.trigger_kind,
          payment_state: taskPayload.payment_state,
          current_step: taskPayload.current_step,
          next_operator_action: taskPayload.next_operator_action,
          offer_key: taskPayload.offer_key,
          build_price_cents: taskPayload.build_price_cents,
          monthly_price_cents: taskPayload.monthly_price_cents,
          company_id: updatedCompany.id,
          primary_contact_id: updatedContact.id,
          deal_id: updatedDeal.id,
          promised_capabilities: taskPayload.promised_capabilities,
          website_domain: taskPayload.website_domain
        }
      });

      return toSummary(tx, context, savedTask.id);
    }),

  updateStatus: async (
    context: CrmRequestContext,
    session: SessionMe,
    input: WebsiteProvisioningStatusUpdateRequest
  ): Promise<WebsiteProvisioningSummary> =>
    withCrmContext(context, async (tx) => {
      const [task] = await tx
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, input.task_id), eq(tasks.tenantId, context.tenant_id)))
        .limit(1);

      if (!task) {
        throw new Error("Website provisioning task not found");
      }

      const parsed = parseTaskNotes(task.notes ?? null);
      if (!parsed) {
        throw new Error("Website provisioning task payload is missing");
      }

      const nextPayload: WebsiteTaskPayload = {
        ...parsed,
        task_id: task.id,
        task_status: input.task_status,
        current_step: input.current_step,
        next_operator_action: input.next_operator_action,
        updated_at: new Date().toISOString()
      };

      await tx
        .update(tasks)
        .set({
          status: input.task_status,
          notes: renderTaskNotes(nextPayload),
          updatedAt: new Date()
        })
        .where(eq(tasks.id, task.id));

      await emitWorkforceReceipt({
        tx,
        workspaceId: context.workspace_id,
        tenantId: context.tenant_id,
        session,
        actorType: "human",
        action: "website.provisioning.status.updated",
        targetType: "crm_task",
        targetId: task.id,
        result: input.task_status === "blocked" ? "pending" : input.task_status === "cancelled" ? "denied" : "success",
        correlationId: crypto.randomUUID(),
        payload: {
          schema: TASK_SCHEMA,
          previous_task_status: parsed.task_status,
          task_status: input.task_status,
          current_step: input.current_step,
          next_operator_action: input.next_operator_action,
          operator_note: input.operator_note ?? null
        }
      });

      return toSummary(tx, context, task.id);
    }),

  markPaymentConfirmed: async (
    context: CrmRequestContext,
    params: {
      payment_reference: string;
      payment_kind: "build" | "monthly";
      operator_note?: string | null;
    }
  ): Promise<WebsiteProvisioningSummary | null> =>
    withCrmContext(context, async (tx) => {
      const existing = await getExistingProvisioningTask(tx, context);
      if (!existing) {
        return null;
      }

      const current = existing.parsed;
      const nextPayload: WebsiteTaskPayload = {
        ...current,
        trigger_kind: "payment_confirmed",
        payment_state: "paid",
        payment_reference: params.payment_reference,
        task_status:
          params.payment_kind === "build" && current.task_status === "blocked" ? "open" : current.task_status,
        current_step:
          params.payment_kind === "build" && current.current_step === "awaiting_payment"
            ? "ready_for_provisioning"
            : current.current_step,
        next_operator_action:
          params.payment_kind === "build" && current.current_step === "awaiting_payment"
            ? current.next_aetherpro_action?.trim() || "Review website intake, assign builder, and start provisioning."
            : current.next_operator_action,
        updated_at: new Date().toISOString()
      };

      await tx
        .update(tasks)
        .set({
          status: nextPayload.task_status,
          notes: renderTaskNotes(nextPayload),
          updatedAt: new Date()
        })
        .where(eq(tasks.id, existing.row.id));

      await emitWorkforceReceipt({
        tx,
        workspaceId: context.workspace_id,
        tenantId: context.tenant_id,
        session: null,
        actorType: "service",
        action: params.payment_kind === "build" ? "website.payment.build.confirmed" : "website.payment.monthly.confirmed",
        targetType: "crm_task",
        targetId: existing.row.id,
        result: "success",
        correlationId: crypto.randomUUID(),
        payload: {
          schema: TASK_SCHEMA,
          payment_reference: params.payment_reference,
          payment_kind: params.payment_kind,
          previous_payment_state: current.payment_state,
          payment_state: nextPayload.payment_state,
          previous_task_status: current.task_status,
          task_status: nextPayload.task_status,
          previous_current_step: current.current_step,
          current_step: nextPayload.current_step,
          next_operator_action: nextPayload.next_operator_action,
          operator_note: params.operator_note ?? null
        }
      });

      return toSummary(tx, context, existing.row.id);
    })
};
