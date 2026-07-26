import { and, eq } from "drizzle-orm";
import {
  companies,
  contacts,
  contractEvents,
  contractRecipients,
  contracts,
  deals
} from "@/lib/server/db/schema";
import { CrmRequestContext } from "@/lib/server/crm/request-context";
import { withCrmContext, type CrmTx } from "@/lib/server/crm/db-context";
import { assertValidContractTransition, computeTransitionPath } from "@/lib/server/crm/contract-state-machine";
import { ContractState } from "@/lib/types/crm";
import { SessionMe } from "@/lib/types/portal";
import { pandadocAdapter } from "@/lib/server/crm/pandadoc-adapter";
import { hasCapability } from "@/lib/shared/workforce-auth";

const actorFromSession = (session: SessionMe) => ({
  userId: session.user_id ?? null,
  subject: session.subject ?? session.email ?? null,
  role: session.workforce_role ?? session.role ?? "customer"
});

const updateContractTimestamp = async (tx: CrmTx, contractId: string): Promise<void> => {
  await tx
    .update(contracts)
    .set({ updatedAt: new Date() })
    .where(eq(contracts.id, contractId));
};

const insertContractEvent = async (params: {
  tx: CrmTx;
  context: CrmRequestContext;
  contractId: string;
  eventType: string;
  fromState: ContractState | null;
  toState: ContractState | null;
  source: string;
  payload?: Record<string, unknown>;
  session: SessionMe;
}): Promise<void> => {
  const actor = actorFromSession(params.session);
  await params.tx.insert(contractEvents).values({
    workspaceId: params.context.workspace_id,
    tenantId: params.context.tenant_id,
    contractId: params.contractId,
    eventType: params.eventType,
    fromState: params.fromState,
    toState: params.toState,
    source: params.source,
    payload: params.payload ?? {},
    actorUserId: actor.userId,
    actorSubject: actor.subject,
    actorRole: actor.role
  });
};

export const crmService = {
  createCompany: async (
    context: CrmRequestContext,
    session: SessionMe,
    input: { name: string; website?: string; industry?: string; notes?: string }
  ) =>
    withCrmContext(context, async (tx) => {
      const actor = actorFromSession(session);
      const [company] = await tx
        .insert(companies)
        .values({
          workspaceId: context.workspace_id,
          tenantId: context.tenant_id,
          name: input.name,
          website: input.website ?? null,
          industry: input.industry ?? null,
          notes: input.notes ?? null,
          createdByUserId: actor.userId,
          createdBySubject: actor.subject,
          createdByRole: actor.role
        })
        .returning();

      return company;
    }),

  createContact: async (
    context: CrmRequestContext,
    session: SessionMe,
    input: {
      companyId?: string;
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      title?: string;
      notes?: string;
    }
  ) =>
    withCrmContext(context, async (tx) => {
      const actor = actorFromSession(session);
      const [contact] = await tx
        .insert(contacts)
        .values({
          workspaceId: context.workspace_id,
          tenantId: context.tenant_id,
          companyId: input.companyId ?? null,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone ?? null,
          title: input.title ?? null,
          notes: input.notes ?? null,
          createdByUserId: actor.userId,
          createdBySubject: actor.subject,
          createdByRole: actor.role
        })
        .returning();

      return contact;
    }),

  createDeal: async (
    context: CrmRequestContext,
    session: SessionMe,
    input: {
      companyId?: string;
      primaryContactId?: string;
      name: string;
      stage: "lead" | "qualified" | "proposal_sent" | "negotiation" | "closed_won" | "closed_lost";
      amountCents?: number;
      currency: string;
      notes?: string;
    }
  ) =>
    withCrmContext(context, async (tx) => {
      const actor = actorFromSession(session);
      const [deal] = await tx
        .insert(deals)
        .values({
          workspaceId: context.workspace_id,
          tenantId: context.tenant_id,
          companyId: input.companyId ?? null,
          primaryContactId: input.primaryContactId ?? null,
          name: input.name,
          stage: input.stage,
          amountCents: input.amountCents ?? null,
          currency: input.currency,
          notes: input.notes ?? null,
          createdByUserId: actor.userId,
          createdBySubject: actor.subject,
          createdByRole: actor.role
        })
        .returning();

      return deal;
    }),

  updateDealStage: async (
    context: CrmRequestContext,
    dealId: string,
    stage: "lead" | "qualified" | "proposal_sent" | "negotiation" | "closed_won" | "closed_lost"
  ) =>
    withCrmContext(context, async (tx) => {
      const [deal] = await tx
        .update(deals)
        .set({ stage, updatedAt: new Date() })
        .where(and(eq(deals.id, dealId), eq(deals.tenantId, context.tenant_id)))
        .returning();

      if (!deal) {
        throw new Error("Not found");
      }

      return deal;
    }),

  createContract: async (
    context: CrmRequestContext,
    session: SessionMe,
    input: {
      dealId?: string;
      companyId?: string;
      primaryContactId?: string;
      title: string;
      approvedTemplateId?: string;
      contractValue?: number;
      currency: string;
      requiresHumanApprovalBeforeSend: boolean;
      customLegalTerms?: string;
      targetState?: ContractState;
      recipients: Array<{ name: string; email: string; role: string; routingOrder: number }>;
    }
  ) =>
    withCrmContext(context, async (tx) => {
      const actor = actorFromSession(session);
      if (input.customLegalTerms && !hasCapability(session, "contract.modify_legal_terms")) {
        throw new Error("Forbidden");
      }

      const targetState = input.targetState ?? "draft";
      if (targetState !== "draft" && !hasCapability(session, "contract.generate")) {
        throw new Error("Forbidden");
      }

      const [contract] = await tx
        .insert(contracts)
        .values({
          workspaceId: context.workspace_id,
          tenantId: context.tenant_id,
          dealId: input.dealId ?? null,
          companyId: input.companyId ?? null,
          primaryContactId: input.primaryContactId ?? null,
          title: input.title,
          state: "draft",
          approvedTemplateId: input.approvedTemplateId ?? null,
          contractValue: input.contractValue?.toFixed(2) ?? null,
          currency: input.currency,
          requiresHumanApprovalBeforeSend: input.requiresHumanApprovalBeforeSend,
          legalTermsLocked: !input.customLegalTerms,
          customLegalTerms: input.customLegalTerms ?? null,
          externalProvider: "pandadoc",
          metadata: {},
          createdByUserId: actor.userId,
          createdBySubject: actor.subject,
          createdByRole: actor.role
        })
        .returning();

      if (input.recipients.length > 0) {
        await tx.insert(contractRecipients).values(
          input.recipients.map((recipient) => ({
            workspaceId: context.workspace_id,
            tenantId: context.tenant_id,
            contractId: contract.id,
            name: recipient.name,
            email: recipient.email,
            role: recipient.role,
            routingOrder: recipient.routingOrder
          }))
        );
      }

      await insertContractEvent({
        tx,
        context,
        contractId: contract.id,
        eventType: "contract.created",
        fromState: null,
        toState: "draft",
        source: "app",
        session,
        payload: {}
      });

      let current = contract;
      for (const nextState of computeTransitionPath(targetState)) {
        current = await crmService.transitionContract(context, session, contract.id, nextState, "app", tx);
      }

      return current;
    }),

  transitionContract: async (
    context: CrmRequestContext,
    session: SessionMe,
    contractId: string,
    nextState: ContractState,
    source = "app",
    existingTx?: CrmTx
  ) => {
    const runner = async (tx: CrmTx) => {
      const [current] = await tx
        .select()
        .from(contracts)
        .where(and(eq(contracts.id, contractId), eq(contracts.tenantId, context.tenant_id)));

      if (!current) {
        throw new Error("Not found");
      }

      assertValidContractTransition(current.state as ContractState, nextState);

      const patch: Partial<typeof current> = {
        state: nextState,
        updatedAt: new Date()
      };

      if (nextState === "generated") {
        const snapshot = await pandadocAdapter.createContract({
          contractId: current.id,
          title: current.title,
          approvedTemplateId: current.approvedTemplateId,
          recipients: []
        });

        patch.externalContractId = snapshot.externalContractId;
        patch.generatedDocumentUrl = snapshot.documentUrl;
      }

      const [updated] = await tx
        .update(contracts)
        .set(patch)
        .where(eq(contracts.id, contractId))
        .returning();

      await insertContractEvent({
        tx,
        context,
        contractId,
        eventType: "contract.state_changed",
        fromState: current.state as ContractState,
        toState: nextState,
        source,
        session,
        payload: {}
      });

      await updateContractTimestamp(tx, contractId);
      return updated;
    };

    if (existingTx) {
      return runner(existingTx);
    }

    return withCrmContext(context, runner);
  },

  sendContract: async (context: CrmRequestContext, session: SessionMe, contractId: string) =>
    withCrmContext(context, async (tx) => {
      if (!hasCapability(session, "contract.send")) {
        throw new Error("Forbidden");
      }

      const [contract] = await tx
        .select()
        .from(contracts)
        .where(and(eq(contracts.id, contractId), eq(contracts.tenantId, context.tenant_id)));

      if (!contract) {
        throw new Error("Not found");
      }

      if (!contract.externalContractId) {
        throw new Error("Contract must be generated before send");
      }

      const snapshot = await pandadocAdapter.sendContract({
        contractId: contract.id,
        externalContractId: contract.externalContractId
      });

      const updated = await crmService.transitionContract(context, session, contractId, "sent", "pandadoc_stub", tx);
      await tx
        .update(contracts)
        .set({ generatedDocumentUrl: snapshot.documentUrl, updatedAt: new Date() })
        .where(eq(contracts.id, contractId));

      return updated;
    }),

  getContract: async (context: CrmRequestContext, contractId: string) =>
    withCrmContext(context, async (tx) => {
      const [contract] = await tx
        .select()
        .from(contracts)
        .where(and(eq(contracts.id, contractId), eq(contracts.tenantId, context.tenant_id)));
      if (!contract) {
        throw new Error("Not found");
      }

      const recipients = await tx
        .select()
        .from(contractRecipients)
        .where(eq(contractRecipients.contractId, contractId));
      const events = await tx
        .select()
        .from(contractEvents)
        .where(eq(contractEvents.contractId, contractId));

      return { contract, recipients, events };
    }),

  applyPandadocWebhook: async (
    context: CrmRequestContext,
    session: SessionMe,
    params: { contractId: string; event: string; externalContractId?: string; documentUrl?: string }
  ) =>
    withCrmContext(context, async (tx) => {
      const [contract] = await tx
        .select()
        .from(contracts)
        .where(and(eq(contracts.id, params.contractId), eq(contracts.tenantId, context.tenant_id)));

      if (!contract) {
        throw new Error("Not found");
      }

      const eventToState: Record<string, ContractState> = {
        "document.viewed": "viewed",
        "document.completed": "completed",
        "document.declined": "declined",
        "document.expired": "expired",
        "document.voided": "voided",
        "document.error": "error"
      };
      const target = eventToState[params.event];

      if (!target) {
        await insertContractEvent({
          tx,
          context,
          contractId: contract.id,
          eventType: params.event,
          fromState: null,
          toState: null,
          source: "pandadoc_webhook",
          payload: {
            external_contract_id: params.externalContractId ?? null,
            document_url: params.documentUrl ?? null
          },
          session
        });
        return contract;
      }

      const updated = await crmService.transitionContract(context, session, contract.id, target, "pandadoc_webhook", tx);
      await tx
        .update(contracts)
        .set({
          externalContractId: params.externalContractId ?? contract.externalContractId,
          generatedDocumentUrl: params.documentUrl ?? contract.generatedDocumentUrl,
          updatedAt: new Date()
        })
        .where(eq(contracts.id, contract.id));

      return updated;
    })
};
