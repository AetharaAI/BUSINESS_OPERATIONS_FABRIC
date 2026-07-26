import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSchema,
  text,
  timestamp,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

export const bofCrm = pgSchema("bof_crm");

export const dealStageEnum = pgEnum("bof_crm_deal_stage", [
  "lead",
  "qualified",
  "proposal_sent",
  "negotiation",
  "closed_won",
  "closed_lost"
]);

export const contractStateEnum = pgEnum("bof_crm_contract_state", [
  "draft",
  "approval_pending",
  "approved",
  "generated",
  "sent",
  "viewed",
  "completed",
  "declined",
  "expired",
  "voided",
  "error"
]);

export const personStatusEnum = pgEnum("bof_workforce_person_status", ["active", "inactive", "archived"]);
export const workforceRelationshipTypeEnum = pgEnum("bof_workforce_relationship_type", [
  "employee",
  "independent_contractor",
  "sales_representative",
  "advisor",
  "vendor"
]);
export const workforceRelationshipStatusEnum = pgEnum("bof_workforce_relationship_status", [
  "draft",
  "active",
  "inactive",
  "suspended",
  "ended"
]);
export const workforceGrantStatusEnum = pgEnum("bof_workforce_grant_status", ["active", "revoked", "expired"]);
export const agreementStatusEnum = pgEnum("bof_workforce_agreement_status", ["draft", "pending", "completed", "revoked"]);
export const complianceDocumentTypeEnum = pgEnum("bof_workforce_document_type", ["w8_ben", "i9", "other"]);
export const complianceDocumentStatusEnum = pgEnum("bof_workforce_document_status", [
  "requested",
  "received",
  "verified",
  "expired",
  "replaced"
]);
export const verificationStatusEnum = pgEnum("bof_workforce_verification_status", [
  "pending",
  "verified",
  "rejected"
]);
export const onboardingCaseStatusEnum = pgEnum("bof_workforce_onboarding_case_status", [
  "draft",
  "invited",
  "identity_confirmed",
  "documents_pending",
  "access_pending",
  "active",
  "blocked",
  "suspended",
  "cancelled",
  "offboarded"
]);

const auditColumns = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
};

export const companies = bofCrm.table("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  website: varchar("website", { length: 255 }),
  industry: varchar("industry", { length: 120 }),
  notes: text("notes"),
  createdByUserId: uuid("created_by_user_id"),
  createdBySubject: text("created_by_subject"),
  createdByRole: text("created_by_role"),
  ...auditColumns
});

export const contacts = bofCrm.table("contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
  firstName: varchar("first_name", { length: 120 }).notNull(),
  lastName: varchar("last_name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  title: varchar("title", { length: 120 }),
  notes: text("notes"),
  createdByUserId: uuid("created_by_user_id"),
  createdBySubject: text("created_by_subject"),
  createdByRole: text("created_by_role"),
  ...auditColumns
});

export const deals = bofCrm.table("deals", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
  primaryContactId: uuid("primary_contact_id").references(() => contacts.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  stage: dealStageEnum("stage").notNull().default("lead"),
  amountCents: integer("amount_cents"),
  currency: varchar("currency", { length: 8 }).notNull().default("USD"),
  notes: text("notes"),
  createdByUserId: uuid("created_by_user_id"),
  createdBySubject: text("created_by_subject"),
  createdByRole: text("created_by_role"),
  ...auditColumns
});

export const contracts = bofCrm.table("contracts", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  dealId: uuid("deal_id").references(() => deals.id, { onDelete: "set null" }),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
  primaryContactId: uuid("primary_contact_id").references(() => contacts.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  state: contractStateEnum("state").notNull().default("draft"),
  approvedTemplateId: varchar("approved_template_id", { length: 255 }),
  contractValue: numeric("contract_value", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 8 }).notNull().default("USD"),
  requiresHumanApprovalBeforeSend: boolean("requires_human_approval_before_send").notNull().default(true),
  legalTermsLocked: boolean("legal_terms_locked").notNull().default(true),
  customLegalTerms: text("custom_legal_terms"),
  externalProvider: varchar("external_provider", { length: 64 }).notNull().default("pandadoc"),
  externalContractId: varchar("external_contract_id", { length: 255 }),
  generatedDocumentUrl: text("generated_document_url"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdByUserId: uuid("created_by_user_id"),
  createdBySubject: text("created_by_subject"),
  createdByRole: text("created_by_role"),
  ...auditColumns
});

export const contractRecipients = bofCrm.table("contract_recipients", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  contractId: uuid("contract_id")
    .notNull()
    .references(() => contracts.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 64 }).notNull().default("signer"),
  routingOrder: integer("routing_order").notNull().default(1),
  ...auditColumns
});

export const contractEvents = bofCrm.table("contract_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  contractId: uuid("contract_id")
    .notNull()
    .references(() => contracts.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 120 }).notNull(),
  fromState: contractStateEnum("from_state"),
  toState: contractStateEnum("to_state"),
  source: varchar("source", { length: 64 }).notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  actorUserId: uuid("actor_user_id"),
  actorSubject: text("actor_subject"),
  actorRole: text("actor_role"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const tasks = bofCrm.table("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  dealId: uuid("deal_id").references(() => deals.id, { onDelete: "set null" }),
  contractId: uuid("contract_id").references(() => contracts.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  status: varchar("status", { length: 64 }).notNull().default("open"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  assignedToUserId: uuid("assigned_to_user_id"),
  notes: text("notes"),
  createdByUserId: uuid("created_by_user_id"),
  createdBySubject: text("created_by_subject"),
  createdByRole: text("created_by_role"),
  ...auditColumns
});

export const people = bofCrm.table("people", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  primaryEmail: varchar("primary_email", { length: 255 }).notNull(),
  primaryPhone: varchar("primary_phone", { length: 64 }),
  status: personStatusEnum("status").notNull().default("active"),
  source: varchar("source", { length: 64 }).notNull().default("bof"),
  sourceRef: varchar("source_ref", { length: 255 }),
  createdByUserId: uuid("created_by_user_id"),
  createdBySubject: text("created_by_subject"),
  createdByRole: text("created_by_role"),
  ...auditColumns
});

export const workforceRelationships = bofCrm.table("workforce_relationships", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  personId: uuid("person_id")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  relationshipType: workforceRelationshipTypeEnum("relationship_type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  status: workforceRelationshipStatusEnum("status").notNull().default("draft"),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }),
  managerPersonId: uuid("manager_person_id"),
  compensationPlanRef: varchar("compensation_plan_ref", { length: 255 }),
  createdByActor: text("created_by_actor").notNull(),
  ...auditColumns
});

export const workforceRoleGrants = bofCrm.table("workforce_role_grants", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  personId: uuid("person_id")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  roleKey: varchar("role_key", { length: 120 }).notNull(),
  capabilityScope: jsonb("capability_scope").$type<string[]>().notNull().default([]),
  scope: jsonb("scope").$type<Record<string, unknown>>().notNull().default({}),
  validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  status: workforceGrantStatusEnum("status").notNull().default("active"),
  grantedByActor: text("granted_by_actor").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const agreementRecords = bofCrm.table("agreement_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  personId: uuid("person_id").references(() => people.id, { onDelete: "set null" }),
  workforceRelationshipId: uuid("workforce_relationship_id").references(() => workforceRelationships.id, { onDelete: "set null" }),
  provider: varchar("provider", { length: 64 }).notNull(),
  providerDocumentRef: varchar("provider_document_ref", { length: 255 }).notNull(),
  agreementType: varchar("agreement_type", { length: 120 }).notNull(),
  status: agreementStatusEnum("status").notNull().default("pending"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  documentStorageRef: text("document_storage_ref"),
  certificateStorageRef: text("certificate_storage_ref"),
  sha256: varchar("sha256", { length: 128 }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  ...auditColumns
});

export const complianceDocumentRequirements = bofCrm.table("compliance_document_requirements", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  personId: uuid("person_id")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  workforceRelationshipId: uuid("workforce_relationship_id")
    .notNull()
    .references(() => workforceRelationships.id, { onDelete: "cascade" }),
  documentType: complianceDocumentTypeEnum("document_type").notNull(),
  status: complianceDocumentStatusEnum("status").notNull().default("requested"),
  requiredAt: timestamp("required_at", { withTimezone: true }).notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  storageRef: text("storage_ref"),
  verificationStatus: verificationStatusEnum("verification_status").notNull().default("pending"),
  verifiedByActor: text("verified_by_actor"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const complianceDocumentVersions = bofCrm.table("compliance_document_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  requirementId: uuid("requirement_id")
    .notNull()
    .references(() => complianceDocumentRequirements.id, { onDelete: "cascade" }),
  storageRef: text("storage_ref").notNull(),
  sha256: varchar("sha256", { length: 128 }).notNull(),
  mimeType: varchar("mime_type", { length: 255 }).notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  uploadedByActor: text("uploaded_by_actor").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const onboardingCases = bofCrm.table("onboarding_cases", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  personId: uuid("person_id")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  workforceRelationshipId: uuid("workforce_relationship_id")
    .notNull()
    .references(() => workforceRelationships.id, { onDelete: "cascade" }),
  status: onboardingCaseStatusEnum("status").notNull().default("draft"),
  currentStep: varchar("current_step", { length: 120 }).notNull().default("draft"),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  assignedOperator: varchar("assigned_operator", { length: 255 }),
  createdByActor: text("created_by_actor").notNull(),
  inviteEmail: varchar("invite_email", { length: 255 }),
  inviteStatus: varchar("invite_status", { length: 64 }).notNull().default("not_sent"),
  inviteSentAt: timestamp("invite_sent_at", { withTimezone: true }),
  lastInviteUrl: text("last_invite_url"),
  ...auditColumns
});

export const workforceReceipts = bofCrm.table("workforce_receipts", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  actorId: text("actor_id"),
  actorType: varchar("actor_type", { length: 64 }).notNull(),
  actorRole: text("actor_role"),
  action: varchar("action", { length: 120 }).notNull(),
  targetType: varchar("target_type", { length: 120 }).notNull(),
  targetId: text("target_id"),
  result: varchar("result", { length: 64 }).notNull(),
  correlationId: uuid("correlation_id").notNull().defaultRandom(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export type CompanyRow = typeof companies.$inferSelect;
export type ContactRow = typeof contacts.$inferSelect;
export type DealRow = typeof deals.$inferSelect;
export type ContractRow = typeof contracts.$inferSelect;
export type ContractRecipientRow = typeof contractRecipients.$inferSelect;
export type ContractEventRow = typeof contractEvents.$inferSelect;
export type TaskRow = typeof tasks.$inferSelect;
export type PersonRow = typeof people.$inferSelect;
export type WorkforceRelationshipRow = typeof workforceRelationships.$inferSelect;
export type WorkforceRoleGrantRow = typeof workforceRoleGrants.$inferSelect;
export type AgreementRecordRow = typeof agreementRecords.$inferSelect;
export type ComplianceDocumentRequirementRow = typeof complianceDocumentRequirements.$inferSelect;
export type ComplianceDocumentVersionRow = typeof complianceDocumentVersions.$inferSelect;
export type OnboardingCaseRow = typeof onboardingCases.$inferSelect;
export type WorkforceReceiptRow = typeof workforceReceipts.$inferSelect;
