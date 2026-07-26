import { z } from "zod";

export const WorkforcePersonStatusSchema = z.enum(["active", "inactive", "archived"]);
export const WorkforceRelationshipTypeSchema = z.enum([
  "employee",
  "independent_contractor",
  "sales_representative",
  "advisor",
  "vendor"
]);
export const WorkforceRelationshipStatusSchema = z.enum(["draft", "active", "inactive", "suspended", "ended"]);
export const WorkforceGrantStatusSchema = z.enum(["active", "revoked", "expired"]);
export const WorkforceDocumentTypeSchema = z.enum(["w8_ben", "i9", "other"]);
export const WorkforceDocumentStatusSchema = z.enum(["requested", "received", "verified", "expired", "replaced"]);
export const WorkforceVerificationStatusSchema = z.enum(["pending", "verified", "rejected"]);
export const WorkforceOnboardingCaseStatusSchema = z.enum([
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

export const WorkforceRoleKeySchema = z.enum(["internal_sales_rep", "internal_operator", "platform_admin"]);

export const WorkforcePersonSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  display_name: z.string(),
  primary_email: z.string().email(),
  primary_phone: z.string().nullable().optional(),
  status: WorkforcePersonStatusSchema,
  source: z.string(),
  source_ref: z.string().nullable().optional(),
  created_by_user_id: z.string().nullable().optional(),
  created_by_subject: z.string().nullable().optional(),
  created_by_role: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string()
});

export const WorkforceRelationshipSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  person_id: z.string().uuid(),
  relationship_type: WorkforceRelationshipTypeSchema,
  title: z.string(),
  status: WorkforceRelationshipStatusSchema,
  start_date: z.string(),
  end_date: z.string().nullable().optional(),
  manager_person_id: z.string().nullable().optional(),
  compensation_plan_ref: z.string().nullable().optional(),
  created_by_actor: z.string(),
  created_at: z.string(),
  updated_at: z.string()
});

export const WorkforceRoleGrantSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  person_id: z.string().uuid(),
  role_key: WorkforceRoleKeySchema,
  capability_scope: z.array(z.string()).default([]),
  scope: z.record(z.unknown()).default({}),
  valid_from: z.string(),
  valid_until: z.string().nullable().optional(),
  status: WorkforceGrantStatusSchema,
  granted_by_actor: z.string(),
  created_at: z.string()
});

export const AgreementRecordSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  person_id: z.string().uuid().nullable().optional(),
  workforce_relationship_id: z.string().uuid().nullable().optional(),
  provider: z.string(),
  provider_document_ref: z.string(),
  agreement_type: z.string(),
  status: z.enum(["draft", "pending", "completed", "revoked"]),
  completed_at: z.string().nullable().optional(),
  document_storage_ref: z.string().nullable().optional(),
  certificate_storage_ref: z.string().nullable().optional(),
  sha256: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.string(),
  updated_at: z.string()
});

export const ComplianceDocumentRequirementSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  person_id: z.string().uuid(),
  workforce_relationship_id: z.string().uuid(),
  document_type: WorkforceDocumentTypeSchema,
  status: WorkforceDocumentStatusSchema,
  required_at: z.string(),
  received_at: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
  storage_ref: z.string().nullable().optional(),
  verification_status: WorkforceVerificationStatusSchema,
  verified_by_actor: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  updated_at: z.string(),
  created_at: z.string()
});

export const ComplianceDocumentVersionSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  requirement_id: z.string().uuid(),
  storage_ref: z.string(),
  sha256: z.string(),
  mime_type: z.string(),
  size_bytes: z.number(),
  uploaded_by_actor: z.string(),
  created_at: z.string()
});

export const OnboardingCaseSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  person_id: z.string().uuid(),
  workforce_relationship_id: z.string().uuid(),
  status: WorkforceOnboardingCaseStatusSchema,
  current_step: z.string(),
  opened_at: z.string(),
  completed_at: z.string().nullable().optional(),
  assigned_operator: z.string().nullable().optional(),
  created_by_actor: z.string(),
  invite_email: z.string().nullable().optional(),
  invite_status: z.string(),
  invite_sent_at: z.string().nullable().optional(),
  last_invite_url: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string()
});

export const WorkforceReceiptSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  actor_id: z.string().nullable().optional(),
  actor_type: z.string(),
  actor_role: z.string().nullable().optional(),
  action: z.string(),
  target_type: z.string(),
  target_id: z.string().nullable().optional(),
  result: z.string(),
  correlation_id: z.string().uuid(),
  payload: z.record(z.unknown()).default({}),
  created_at: z.string()
});

export const WorkforceSuggestionSchema = z.object({
  person_id: z.string().nullable().optional(),
  display_name: z.string(),
  primary_email: z.string().email(),
  relationship_labels: z.array(z.string()).default([]),
  source: z.string(),
  confidence: z.number()
});

export const WorkforceSuggestionListSchema = z.object({
  suggestions: z.array(WorkforceSuggestionSchema)
});

export const WorkforceOnboardingBundleSchema = z.object({
  person: WorkforcePersonSchema,
  relationship: WorkforceRelationshipSchema,
  role_grant: WorkforceRoleGrantSchema,
  agreement: AgreementRecordSchema.nullable(),
  compliance_requirements: z.array(ComplianceDocumentRequirementSchema),
  document_versions: z.array(ComplianceDocumentVersionSchema),
  onboarding_case: OnboardingCaseSchema,
  receipts: z.array(WorkforceReceiptSchema)
});

export const WorkforceOnboardingBundleListSchema = z.object({
  items: z.array(WorkforceOnboardingBundleSchema)
});

export const WorkforceOnboardingUpsertRequestSchema = z.object({
  workspace_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  person_id: z.string().uuid().optional(),
  display_name: z.string().min(2),
  primary_email: z.string().email(),
  primary_phone: z.string().nullable().optional(),
  relationship_type: WorkforceRelationshipTypeSchema,
  title: z.string().min(2),
  role_key: WorkforceRoleKeySchema,
  start_date: z.string().datetime().optional(),
  agreement_provider: z.string().min(1),
  agreement_provider_document_ref: z.string().min(1),
  agreement_type: z.string().min(1),
  agreement_status: z.enum(["draft", "pending", "completed", "revoked"]),
  agreement_completed_at: z.string().datetime().nullable().optional(),
  document_storage_ref: z.string().nullable().optional(),
  certificate_storage_ref: z.string().nullable().optional(),
  agreement_sha256: z.string().nullable().optional(),
  compliance_document_type: WorkforceDocumentTypeSchema.default("w8_ben"),
  compliance_notes: z.string().nullable().optional(),
  assigned_operator: z.string().nullable().optional()
});

export const WorkforceInviteRequestSchema = z.object({
  onboarding_case_id: z.string().uuid()
});

export const WorkforceInviteResponseSchema = z.object({
  invite_url: z.string().nullable(),
  invite_email: z.string().email(),
  status: z.string(),
  delivery_mode: z.enum(["email", "direct_link", "both"]),
  onboarding_case_id: z.string().uuid(),
  receipt_correlation_id: z.string().uuid()
});

export const WorkforceDocumentUploadResponseSchema = z.object({
  requirement: ComplianceDocumentRequirementSchema,
  version: ComplianceDocumentVersionSchema,
  receipt: WorkforceReceiptSchema
});

export const WorkforceVerifyRequirementRequestSchema = z.object({
  verification_status: WorkforceVerificationStatusSchema,
  notes: z.string().nullable().optional()
});

export type WorkforceOnboardingBundle = z.infer<typeof WorkforceOnboardingBundleSchema>;
export type WorkforceOnboardingUpsertRequest = z.infer<typeof WorkforceOnboardingUpsertRequestSchema>;
export type WorkforceSuggestion = z.infer<typeof WorkforceSuggestionSchema>;
export type WorkforceInviteRequest = z.infer<typeof WorkforceInviteRequestSchema>;
export type WorkforceInviteResponse = z.infer<typeof WorkforceInviteResponseSchema>;
export type WorkforceDocumentUploadResponse = z.infer<typeof WorkforceDocumentUploadResponseSchema>;
export type WorkforceVerifyRequirementRequest = z.infer<typeof WorkforceVerifyRequirementRequestSchema>;
