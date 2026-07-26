import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import {
  agreementRecords,
  companies,
  complianceDocumentRequirements,
  complianceDocumentVersions,
  contacts,
  onboardingCases,
  people,
  workforceReceipts,
  workforceRelationships,
  workforceRoleGrants
} from "@/lib/server/db/schema";
import { withCrmContext, type CrmTx } from "@/lib/server/crm/db-context";
import { SessionMe } from "@/lib/types/portal";
import {
  WorkforceOnboardingUpsertRequest,
  WorkforceSuggestionSchema,
  WorkforceOnboardingCaseStatusSchema,
  WorkforceRoleKeySchema,
  WorkforceDocumentTypeSchema
} from "@/lib/types/workforce";
import {
  defaultCapabilityScopeForRole,
  defaultTenantScopeModeForRole,
  normalizeWorkforceRole
} from "@/lib/shared/workforce-auth";
import { emitEvidenceReceipt, emitWorkforceReceipt, actorIdentity } from "@/lib/server/workforce/receipts";
import { storeWorkforceDocument } from "@/lib/server/workforce/storage";
import { serverEnv } from "@/lib/server/env";
import { resolveWorkforceContext, toCrmRequestContext, WorkforceContext } from "@/lib/server/workforce/context";
import { dispatchWorkforceInvite } from "@/lib/server/workforce/invite-delivery";

const actorRole = (session: SessionMe | null) => session?.workforce_role ?? session?.role ?? "customer";
const actorString = (session: SessionMe | null) => actorIdentity(session);

const mapPerson = (row: typeof people.$inferSelect) => ({
  id: row.id,
  workspace_id: row.workspaceId,
  tenant_id: row.tenantId,
  display_name: row.displayName,
  primary_email: row.primaryEmail,
  primary_phone: row.primaryPhone ?? null,
  status: row.status,
  source: row.source,
  source_ref: row.sourceRef ?? null,
  created_by_user_id: row.createdByUserId ?? null,
  created_by_subject: row.createdBySubject ?? null,
  created_by_role: row.createdByRole ?? null,
  created_at: row.createdAt.toISOString(),
  updated_at: row.updatedAt.toISOString()
});

const mapRelationship = (row: typeof workforceRelationships.$inferSelect) => ({
  id: row.id,
  workspace_id: row.workspaceId,
  tenant_id: row.tenantId,
  person_id: row.personId,
  relationship_type: row.relationshipType,
  title: row.title,
  status: row.status,
  start_date: row.startDate.toISOString(),
  end_date: row.endDate?.toISOString() ?? null,
  manager_person_id: row.managerPersonId ?? null,
  compensation_plan_ref: row.compensationPlanRef ?? null,
  created_by_actor: row.createdByActor,
  created_at: row.createdAt.toISOString(),
  updated_at: row.updatedAt.toISOString()
});

const mapGrant = (row: typeof workforceRoleGrants.$inferSelect) => ({
  id: row.id,
  workspace_id: row.workspaceId,
  tenant_id: row.tenantId,
  person_id: row.personId,
  role_key: row.roleKey,
  capability_scope: Array.isArray(row.capabilityScope) ? row.capabilityScope : [],
  scope: row.scope ?? {},
  valid_from: row.validFrom.toISOString(),
  valid_until: row.validUntil?.toISOString() ?? null,
  status: row.status,
  granted_by_actor: row.grantedByActor,
  created_at: row.createdAt.toISOString()
});

const mapAgreement = (row: typeof agreementRecords.$inferSelect | undefined | null) =>
  row
    ? {
        id: row.id,
        workspace_id: row.workspaceId,
        tenant_id: row.tenantId,
        person_id: row.personId ?? null,
        workforce_relationship_id: row.workforceRelationshipId ?? null,
        provider: row.provider,
        provider_document_ref: row.providerDocumentRef,
        agreement_type: row.agreementType,
        status: row.status,
        completed_at: row.completedAt?.toISOString() ?? null,
        document_storage_ref: row.documentStorageRef ?? null,
        certificate_storage_ref: row.certificateStorageRef ?? null,
        sha256: row.sha256 ?? null,
        metadata: row.metadata ?? {},
        created_at: row.createdAt.toISOString(),
        updated_at: row.updatedAt.toISOString()
      }
    : null;

const mapRequirement = (row: typeof complianceDocumentRequirements.$inferSelect) => ({
  id: row.id,
  workspace_id: row.workspaceId,
  tenant_id: row.tenantId,
  person_id: row.personId,
  workforce_relationship_id: row.workforceRelationshipId,
  document_type: row.documentType,
  status: row.status,
  required_at: row.requiredAt.toISOString(),
  received_at: row.receivedAt?.toISOString() ?? null,
  expires_at: row.expiresAt?.toISOString() ?? null,
  storage_ref: row.storageRef ?? null,
  verification_status: row.verificationStatus,
  verified_by_actor: row.verifiedByActor ?? null,
  notes: row.notes ?? null,
  updated_at: row.updatedAt.toISOString(),
  created_at: row.createdAt.toISOString()
});

const mapVersion = (row: typeof complianceDocumentVersions.$inferSelect) => ({
  id: row.id,
  workspace_id: row.workspaceId,
  tenant_id: row.tenantId,
  requirement_id: row.requirementId,
  storage_ref: row.storageRef,
  sha256: row.sha256,
  mime_type: row.mimeType,
  size_bytes: row.sizeBytes,
  uploaded_by_actor: row.uploadedByActor,
  created_at: row.createdAt.toISOString()
});

const mapCase = (row: typeof onboardingCases.$inferSelect) => ({
  id: row.id,
  workspace_id: row.workspaceId,
  tenant_id: row.tenantId,
  person_id: row.personId,
  workforce_relationship_id: row.workforceRelationshipId,
  status: row.status,
  current_step: row.currentStep,
  opened_at: row.openedAt.toISOString(),
  completed_at: row.completedAt?.toISOString() ?? null,
  assigned_operator: row.assignedOperator ?? null,
  created_by_actor: row.createdByActor,
  invite_email: row.inviteEmail ?? null,
  invite_status: row.inviteStatus,
  invite_sent_at: row.inviteSentAt?.toISOString() ?? null,
  last_invite_url: row.lastInviteUrl ?? null,
  created_at: row.createdAt.toISOString(),
  updated_at: row.updatedAt.toISOString()
});

const mapReceipt = (row: any) => ({
  id: row.id,
  workspace_id: row.workspaceId,
  tenant_id: row.tenantId,
  actor_id: row.actorId ?? null,
  actor_type: row.actorType,
  actor_role: row.actorRole ?? null,
  action: row.action,
  target_type: row.targetType,
  target_id: row.targetId ?? null,
  result: row.result,
  correlation_id: row.correlationId,
  canonical_event_id:
    typeof row.payload?.redwatch?.canonical_event_id === "string" ? row.payload.redwatch.canonical_event_id : null,
  redwatch_evidence_id:
    typeof row.payload?.redwatch?.evidence_id === "string" ? row.payload.redwatch.evidence_id : null,
  redwatch_emit_status:
    typeof row.payload?.redwatch?.status === "string" ? row.payload.redwatch.status : null,
  payload: row.payload ?? {},
  created_at: row.createdAt.toISOString()
});

const fetchBundle = async (tx: CrmTx, context: WorkforceContext, personId: string) => {
  const [person] = await tx.select().from(people).where(and(eq(people.id, personId), eq(people.tenantId, context.tenantId)));
  if (!person) {
    throw new Error("Not found");
  }

  const [relationship] = await tx
    .select()
    .from(workforceRelationships)
    .where(and(eq(workforceRelationships.personId, personId), eq(workforceRelationships.tenantId, context.tenantId)))
    .orderBy(desc(workforceRelationships.createdAt));
  if (!relationship) {
    throw new Error("Not found");
  }

  const [grant] = await tx
    .select()
    .from(workforceRoleGrants)
    .where(and(eq(workforceRoleGrants.personId, personId), eq(workforceRoleGrants.tenantId, context.tenantId)))
    .orderBy(desc(workforceRoleGrants.createdAt));

  const [agreement] = await tx
    .select()
    .from(agreementRecords)
    .where(and(eq(agreementRecords.personId, personId), eq(agreementRecords.tenantId, context.tenantId)))
    .orderBy(desc(agreementRecords.updatedAt));

  const requirements = await tx
    .select()
    .from(complianceDocumentRequirements)
    .where(and(eq(complianceDocumentRequirements.personId, personId), eq(complianceDocumentRequirements.tenantId, context.tenantId)))
    .orderBy(desc(complianceDocumentRequirements.createdAt));

  const versions =
    requirements.length > 0
      ? await tx
          .select()
          .from(complianceDocumentVersions)
          .where(
            and(
              eq(complianceDocumentVersions.tenantId, context.tenantId),
              inArray(
                complianceDocumentVersions.requirementId,
                requirements.map((item) => item.id)
              )
            )
          )
          .orderBy(desc(complianceDocumentVersions.createdAt))
      : [];

  const [onboardingCase] = await tx
    .select()
    .from(onboardingCases)
    .where(and(eq(onboardingCases.personId, personId), eq(onboardingCases.tenantId, context.tenantId)))
    .orderBy(desc(onboardingCases.createdAt));

  const receipts = onboardingCase
    ? await tx
        .select()
        .from(workforceReceipts)
        .where(eq(workforceReceipts.tenantId, context.tenantId))
        .orderBy(desc(workforceReceipts.createdAt))
    : [];

  return {
    person: mapPerson(person),
    relationship: mapRelationship(relationship),
    role_grant: grant ? mapGrant(grant) : null,
    agreement: mapAgreement(agreement),
    compliance_requirements: requirements.map(mapRequirement),
    document_versions: versions.map(mapVersion),
    onboarding_case: onboardingCase ? mapCase(onboardingCase) : null,
    receipts: receipts
      .filter(
        (row: any) =>
          row.targetId === personId ||
          row.payload?.person_id === personId ||
          row.payload?.subject_id === personId
      )
      .map(mapReceipt)
  };
};

const resolvePersonBySession = async (session: SessionMe) => {
  const context = resolveWorkforceContext(session);
  return withCrmContext(toCrmRequestContext(context), async (tx) => {
    const [person] = await tx
      .select()
      .from(people)
      .where(
        and(
          eq(people.workspaceId, context.workspaceId),
          eq(people.tenantId, context.tenantId),
          eq(people.primaryEmail, (session.email ?? "").trim().toLowerCase())
        )
      );

    return person ?? null;
  });
};

export const workforceService = {
  resolveWorkforceIdentity: async (session: SessionMe, raw: Record<string, unknown>) => {
    const persistent = await resolvePersonBySession(session);
    if (!persistent) {
      return null;
    }

    const context = resolveWorkforceContext(session);
    return withCrmContext(toCrmRequestContext(context), async (tx) => {
      const [grant] = await tx
        .select()
        .from(workforceRoleGrants)
        .where(
          and(
            eq(workforceRoleGrants.personId, persistent.id),
            eq(workforceRoleGrants.tenantId, context.tenantId),
            eq(workforceRoleGrants.status, "active")
          )
        )
        .orderBy(desc(workforceRoleGrants.createdAt));

      if (!grant) {
        return null;
      }

      const role = normalizeWorkforceRole(grant.roleKey);
      if (!role) {
        return null;
      }

      return {
        subject:
          (typeof raw.subject === "string" ? raw.subject : null) ??
          (typeof raw.sub === "string" ? raw.sub : null) ??
          session.subject ??
          session.user_id ??
          session.email ??
          null,
        handle:
          (typeof raw.handle === "string" ? raw.handle : null) ??
          session.handle ??
          session.email?.split("@")[0] ??
          null,
        workforce_role: role,
        capability_scope: Array.isArray(grant.capabilityScope)
          ? grant.capabilityScope
          : defaultCapabilityScopeForRole(role),
        tenant_scope_mode:
          typeof grant.scope?.tenant_scope_mode === "string"
            ? String(grant.scope.tenant_scope_mode)
            : defaultTenantScopeModeForRole(role),
        person_id: persistent.id,
        workspace_id: context.workspaceId,
        tenant_id: context.tenantId
      };
    });
  },

  suggestPeople: async (context: WorkforceContext, query: string, limit = 8) =>
    withCrmContext(toCrmRequestContext(context), async (tx) => {
      const q = query.trim();
      if (q.length < 2) {
        return [];
      }

      const peopleRows = await tx
        .select()
        .from(people)
        .where(
          and(
            eq(people.workspaceId, context.workspaceId),
            eq(people.tenantId, context.tenantId),
            or(ilike(people.displayName, `%${q}%`), ilike(people.primaryEmail, `%${q}%`))
          )
        )
        .orderBy(desc(people.updatedAt))
        .limit(limit);

      const personIds = peopleRows.map((row) => row.id);
      const relationshipRows =
        personIds.length > 0
          ? await tx.select().from(workforceRelationships).where(inArray(workforceRelationships.personId, personIds))
          : [];

      const personSuggestions = peopleRows.map((row) =>
        WorkforceSuggestionSchema.parse({
          person_id: row.id,
          display_name: row.displayName,
          primary_email: row.primaryEmail,
          relationship_labels: relationshipRows
            .filter((relationship) => relationship.personId === row.id)
            .map((relationship) => relationship.relationshipType),
          source: "bof",
          confidence: 1
        })
      );

      if (personSuggestions.length >= limit) {
        return personSuggestions;
      }

      const contactRows = await tx
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.workspaceId, context.workspaceId),
            eq(contacts.tenantId, context.tenantId),
            or(
              ilike(contacts.firstName, `%${q}%`),
              ilike(contacts.lastName, `%${q}%`),
              ilike(contacts.email, `%${q}%`)
            )
          )
        )
        .limit(limit - personSuggestions.length);

      const companyIds = [...new Set(contactRows.map((row) => row.companyId).filter((value): value is string => Boolean(value)))];
      const companyRows =
        companyIds.length > 0
          ? await tx.select().from(companies).where(inArray(companies.id, companyIds))
          : [];

      const knownEmails = new Set(personSuggestions.map((item) => item.primary_email));
      const contactSuggestions = contactRows
        .filter((row) => !knownEmails.has(row.email))
        .map((row) =>
          WorkforceSuggestionSchema.parse({
            person_id: null,
            display_name: `${row.firstName} ${row.lastName}`.trim(),
            primary_email: row.email,
            relationship_labels: row.companyId
              ? companyRows.filter((company) => company.id === row.companyId).map((company) => `crm:${company.name}`)
              : ["crm_contact"],
            source: "crm_contact",
            confidence: 0.65
          })
        );

      return [...personSuggestions, ...contactSuggestions].slice(0, limit);
    }),

  upsertOnboardingCase: async (session: SessionMe, input: WorkforceOnboardingUpsertRequest) =>
    withCrmContext({ workspace_id: input.workspace_id, tenant_id: input.tenant_id }, async (tx) => {
      const normalizedEmail = input.primary_email.trim().toLowerCase();
      let [person] = input.person_id
        ? await tx.select().from(people).where(eq(people.id, input.person_id))
        : await tx
            .select()
            .from(people)
            .where(and(eq(people.workspaceId, input.workspace_id), eq(people.tenantId, input.tenant_id), eq(people.primaryEmail, normalizedEmail)));

      if (!person) {
        [person] = await tx
          .insert(people)
          .values({
            workspaceId: input.workspace_id,
            tenantId: input.tenant_id,
            displayName: input.display_name,
            primaryEmail: normalizedEmail,
            primaryPhone: input.primary_phone ?? null,
            status: "active",
            source: "bof",
            createdByUserId: session.user_id ?? null,
            createdBySubject: session.subject ?? session.email ?? null,
            createdByRole: actorRole(session)
          })
          .returning();
      } else {
        [person] = await tx
          .update(people)
          .set({
            displayName: input.display_name,
            primaryEmail: normalizedEmail,
            primaryPhone: input.primary_phone ?? null,
            updatedAt: new Date()
          })
          .where(eq(people.id, person.id))
          .returning();
      }

      let [relationship] = await tx
        .select()
        .from(workforceRelationships)
        .where(
          and(
            eq(workforceRelationships.personId, person.id),
            eq(workforceRelationships.relationshipType, input.relationship_type),
            eq(workforceRelationships.tenantId, input.tenant_id)
          )
        )
        .orderBy(desc(workforceRelationships.createdAt));

      if (!relationship) {
        [relationship] = await tx
          .insert(workforceRelationships)
          .values({
            workspaceId: input.workspace_id,
            tenantId: input.tenant_id,
            personId: person.id,
            relationshipType: input.relationship_type,
            title: input.title,
            status: "active",
            startDate: input.start_date ? new Date(input.start_date) : new Date(),
            createdByActor: actorString(session)
          })
          .returning();
      }

      const capabilityScope = defaultCapabilityScopeForRole(WorkforceRoleKeySchema.parse(input.role_key));
      const tenantScopeMode = defaultTenantScopeModeForRole(WorkforceRoleKeySchema.parse(input.role_key));
      let [grant] = await tx
        .select()
        .from(workforceRoleGrants)
        .where(and(eq(workforceRoleGrants.personId, person.id), eq(workforceRoleGrants.roleKey, input.role_key), eq(workforceRoleGrants.status, "active")))
        .orderBy(desc(workforceRoleGrants.createdAt));
      if (!grant) {
        [grant] = await tx
          .insert(workforceRoleGrants)
          .values({
            workspaceId: input.workspace_id,
            tenantId: input.tenant_id,
            personId: person.id,
            roleKey: input.role_key,
            capabilityScope,
            scope: { tenant_scope_mode: tenantScopeMode },
            validFrom: new Date(),
            status: "active",
            grantedByActor: actorString(session)
          })
          .returning();
      }

      let [agreement] = await tx
        .select()
        .from(agreementRecords)
        .where(and(eq(agreementRecords.personId, person.id), eq(agreementRecords.providerDocumentRef, input.agreement_provider_document_ref)))
        .orderBy(desc(agreementRecords.updatedAt));
      if (!agreement) {
        [agreement] = await tx
          .insert(agreementRecords)
          .values({
            workspaceId: input.workspace_id,
            tenantId: input.tenant_id,
            personId: person.id,
            workforceRelationshipId: relationship.id,
            provider: input.agreement_provider,
            providerDocumentRef: input.agreement_provider_document_ref,
            agreementType: input.agreement_type,
            status: input.agreement_status,
            completedAt: input.agreement_completed_at ? new Date(input.agreement_completed_at) : null,
            documentStorageRef: input.document_storage_ref ?? null,
            certificateStorageRef: input.certificate_storage_ref ?? null,
            sha256: input.agreement_sha256 ?? null
          })
          .returning();
      } else {
        [agreement] = await tx
          .update(agreementRecords)
          .set({
            status: input.agreement_status,
            completedAt: input.agreement_completed_at ? new Date(input.agreement_completed_at) : null,
            documentStorageRef: input.document_storage_ref ?? null,
            certificateStorageRef: input.certificate_storage_ref ?? null,
            sha256: input.agreement_sha256 ?? null,
            updatedAt: new Date()
          })
          .where(eq(agreementRecords.id, agreement.id))
          .returning();
      }

      let [requirement] = await tx
        .select()
        .from(complianceDocumentRequirements)
        .where(
          and(
            eq(complianceDocumentRequirements.personId, person.id),
            eq(complianceDocumentRequirements.workforceRelationshipId, relationship.id),
            eq(complianceDocumentRequirements.documentType, WorkforceDocumentTypeSchema.parse(input.compliance_document_type))
          )
        )
        .orderBy(desc(complianceDocumentRequirements.createdAt));

      if (!requirement) {
        [requirement] = await tx
          .insert(complianceDocumentRequirements)
          .values({
            workspaceId: input.workspace_id,
            tenantId: input.tenant_id,
            personId: person.id,
            workforceRelationshipId: relationship.id,
            documentType: input.compliance_document_type,
            status: "requested",
            requiredAt: new Date(),
            verificationStatus: "pending",
            notes: input.compliance_notes ?? null
          })
          .returning();
      }

      let [onboardingCase] = await tx
        .select()
        .from(onboardingCases)
        .where(and(eq(onboardingCases.personId, person.id), eq(onboardingCases.workforceRelationshipId, relationship.id)))
        .orderBy(desc(onboardingCases.createdAt));

      if (!onboardingCase) {
        [onboardingCase] = await tx
          .insert(onboardingCases)
          .values({
            workspaceId: input.workspace_id,
            tenantId: input.tenant_id,
            personId: person.id,
            workforceRelationshipId: relationship.id,
            status: "documents_pending",
            currentStep: input.agreement_status === "completed" ? "documents_pending" : "draft",
            openedAt: new Date(),
            assignedOperator: input.assigned_operator ?? serverEnv.workforceDefaultOperatorEmail ?? null,
            createdByActor: actorString(session),
            inviteEmail: normalizedEmail
          })
          .returning();
      }

      const correlationId = crypto.randomUUID();
      await emitWorkforceReceipt({
        tx,
        workspaceId: input.workspace_id,
        tenantId: input.tenant_id,
        session,
        actorType: "human",
        action: "workforce.role.granted",
        targetType: "person",
        targetId: person.id,
        correlationId,
        payload: { role_key: input.role_key, person_id: person.id }
      });
      await emitWorkforceReceipt({
        tx,
        workspaceId: input.workspace_id,
        tenantId: input.tenant_id,
        session,
        actorType: "human",
        action: "compliance_document.requested",
        targetType: "compliance_document_requirement",
        targetId: requirement.id,
        correlationId,
        payload: { document_type: requirement.documentType, person_id: person.id }
      });

      return fetchBundle(tx, { workspaceId: input.workspace_id, tenantId: input.tenant_id }, person.id);
    }),

  getOnboardingBundleForSession: async (session: SessionMe) => {
    const person = await resolvePersonBySession(session);
    if (!person) {
      throw new Error("Not found");
    }
    const context = resolveWorkforceContext(session);
    return withCrmContext(toCrmRequestContext(context), async (tx) => fetchBundle(tx, context, person.id));
  },

  listOnboardingBundles: async (context: WorkforceContext) =>
    withCrmContext(toCrmRequestContext(context), async (tx) => {
      const rows = await tx.select().from(onboardingCases).where(eq(onboardingCases.tenantId, context.tenantId)).orderBy(desc(onboardingCases.updatedAt));
      const bundles = [];
      for (const row of rows) {
        bundles.push(await fetchBundle(tx, context, row.personId));
      }
      return bundles;
    }),

  sendInvite: async (session: SessionMe, onboardingCaseId: string) => {
    const context = resolveWorkforceContext(session);
    return withCrmContext(toCrmRequestContext(context), async (tx) => {
      const [onboardingCase] = await tx.select().from(onboardingCases).where(eq(onboardingCases.id, onboardingCaseId));
      if (!onboardingCase) {
        throw new Error("Not found");
      }
      const [person] = await tx.select().from(people).where(eq(people.id, onboardingCase.personId));
      if (!person) {
        throw new Error("Not found");
      }
      const [agreement] = await tx
        .select()
        .from(agreementRecords)
        .where(and(eq(agreementRecords.personId, person.id), eq(agreementRecords.tenantId, context.tenantId)))
        .orderBy(desc(agreementRecords.updatedAt));
      const delivery = await dispatchWorkforceInvite(person.primaryEmail, undefined, {
        onboardingCaseId: onboardingCase.id
      });
      const receipt = await emitWorkforceReceipt({
        tx,
        workspaceId: context.workspaceId,
        tenantId: context.tenantId,
        session,
        actorType: "human",
        action: "workforce.invited",
        targetType: "onboarding_case",
        targetId: onboardingCase.id,
        payload: {
          person_id: person.id,
          invite_email: person.primaryEmail,
          delivery_mode: delivery.delivery_mode,
          invite_status: delivery.status
        }
      });

      await emitEvidenceReceipt({
        tx,
        workspaceId: context.workspaceId,
        tenantId: context.tenantId,
        session,
        targetType: "onboarding_case",
        targetId: onboardingCase.id,
        evidenceType: "workforce.invite_delivery",
        subjectId: person.id,
        subjectEmail: person.primaryEmail,
        subjectHandle: person.primaryEmail.split("@")[0] ?? null,
        correlationId: receipt.correlationId,
        payload: {
          person_id: person.id,
          onboarding_case_id: onboardingCase.id,
          agreement_id: agreement?.id ?? null,
          agreement_provider: agreement?.provider ?? null,
          agreement_provider_document_ref: agreement?.providerDocumentRef ?? null,
          agreement_sha256: agreement?.sha256 ?? null,
          delivery_mode: delivery.delivery_mode,
          delivery_state: delivery.status,
          delivery_recipient: person.primaryEmail,
          invite_url_present: Boolean(delivery.invite_url),
          evidence_summary: `Invite delivery emitted for ${person.primaryEmail} under onboarding case ${onboardingCase.id}.`
        }
      });

      const nextStatus = delivery.status === "email_sent" || delivery.invite_url ? "invited" : "access_pending";
      await tx
        .update(onboardingCases)
        .set({
          status: WorkforceOnboardingCaseStatusSchema.parse(nextStatus),
          currentStep: nextStatus === "invited" ? "identity_confirmed" : "access_pending",
          inviteEmail: person.primaryEmail,
          inviteStatus: nextStatus === "invited" ? "sent" : "pending_account",
          inviteSentAt: new Date(),
          lastInviteUrl: delivery.invite_url,
          updatedAt: new Date()
        })
        .where(eq(onboardingCases.id, onboardingCase.id));

      return {
        invite_url: delivery.invite_url,
        invite_email: person.primaryEmail,
        status: nextStatus === "invited" ? delivery.status : "pending_account",
        delivery_mode: delivery.delivery_mode,
        onboarding_case_id: onboardingCase.id,
        receipt_correlation_id: receipt.correlationId
      };
    });
  },

  uploadOwnDocument: async (session: SessionMe, requirementId: string, file: { name: string; type: string; bytes: Buffer }) => {
    const context = resolveWorkforceContext(session);
    const person = await resolvePersonBySession(session);
    if (!person) {
      throw new Error("Forbidden");
    }
    return withCrmContext(toCrmRequestContext(context), async (tx) => {
      const [requirement] = await tx.select().from(complianceDocumentRequirements).where(eq(complianceDocumentRequirements.id, requirementId));
      if (!requirement || requirement.personId !== person.id) {
        throw new Error("Forbidden");
      }

      const stored = await storeWorkforceDocument({
        keyPrefix: `workforce/${context.workspaceId}/${person.id}/${requirement.documentType}`,
        fileName: file.name,
        mimeType: file.type,
        bytes: file.bytes
      });

      const [version] = await tx
        .insert(complianceDocumentVersions)
        .values({
          workspaceId: context.workspaceId,
          tenantId: context.tenantId,
          requirementId: requirement.id,
          storageRef: stored.storageRef,
          sha256: stored.sha256,
          mimeType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
          uploadedByActor: actorString(session)
        })
        .returning();

      const [updatedRequirement] = await tx
        .update(complianceDocumentRequirements)
        .set({
          status: "received",
          receivedAt: new Date(),
          storageRef: stored.storageRef,
          verificationStatus: "pending",
          updatedAt: new Date()
        })
        .where(eq(complianceDocumentRequirements.id, requirement.id))
        .returning();

      const receipt = await emitWorkforceReceipt({
        tx,
        workspaceId: context.workspaceId,
        tenantId: context.tenantId,
        session,
        actorType: "human",
        action: "compliance_document.uploaded",
        targetType: "compliance_document_requirement",
        targetId: requirement.id,
        payload: { person_id: person.id, document_type: requirement.documentType, storage_ref: stored.storageRef }
      });

      return {
        requirement: mapRequirement(updatedRequirement),
        version: mapVersion(version),
        receipt: mapReceipt(receipt)
      };
    });
  },

  verifyRequirement: async (session: SessionMe, requirementId: string, verificationStatus: "verified" | "rejected", notes?: string | null) => {
    const context = resolveWorkforceContext(session);
    return withCrmContext(toCrmRequestContext(context), async (tx) => {
      const [requirement] = await tx.select().from(complianceDocumentRequirements).where(eq(complianceDocumentRequirements.id, requirementId));
      if (!requirement) {
        throw new Error("Not found");
      }
      const [updatedRequirement] = await tx
        .update(complianceDocumentRequirements)
        .set({
          verificationStatus,
          status: verificationStatus === "verified" ? "verified" : "received",
          verifiedByActor: actorString(session),
          notes: notes ?? requirement.notes ?? null,
          updatedAt: new Date()
        })
        .where(eq(complianceDocumentRequirements.id, requirementId))
        .returning();

      const [onboardingCase] = await tx
        .select()
        .from(onboardingCases)
        .where(eq(onboardingCases.workforceRelationshipId, updatedRequirement.workforceRelationshipId))
        .orderBy(desc(onboardingCases.createdAt));

      if (verificationStatus === "verified" && onboardingCase) {
        await tx
          .update(onboardingCases)
          .set({
            status: "active",
            currentStep: "active",
            completedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(onboardingCases.id, onboardingCase.id));
      }

      await emitWorkforceReceipt({
        tx,
        workspaceId: context.workspaceId,
        tenantId: context.tenantId,
        session,
        actorType: "human",
        action: "compliance_document.verified",
        targetType: "compliance_document_requirement",
        targetId: requirementId,
        payload: { verification_status: verificationStatus }
      });

      return mapRequirement(updatedRequirement);
    });
  },

  getPromiseSeedInput: (session: SessionMe) => {
    const context = resolveWorkforceContext(session);
    return {
      workspace_id: context.workspaceId,
      tenant_id: context.tenantId,
      display_name: "Promise Sunday",
      primary_email: "sundaepromix@gmail.com",
      primary_phone: null,
      relationship_type: "independent_contractor" as const,
      title: "Independent Sales Representative",
      role_key: "internal_sales_rep" as const,
      start_date: new Date("2026-07-16T05:52:08Z").toISOString(),
      agreement_provider: "pandadoc",
      agreement_provider_document_ref: "RECUR-R8EPR-BU8UT-HEQBN",
      agreement_type: "independent_sales_representative_commission",
      agreement_status: "completed" as const,
      agreement_completed_at: "2026-07-16T05:52:08Z",
      document_storage_ref: null,
      certificate_storage_ref: null,
      agreement_sha256: null,
      compliance_document_type: "w8_ben" as const,
      compliance_notes: "W-8BEN requested for foreign independent contractor onboarding.",
      assigned_operator: session.email ?? null
    };
  }
};
