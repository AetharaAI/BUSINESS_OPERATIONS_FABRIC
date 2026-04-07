import { z } from "zod";

export const AgentModeSchema = z.enum(["enabled", "bypass", "after_hours_only"]);

export const PortalDashboardSchema = z.object({
  tenant_id: z.string().optional(),
  tenant_name: z.string().optional(),
  mode: AgentModeSchema,
  effective_in_live_routing: z.boolean().default(false),
  today_calls: z.number().optional(),
  seven_day_calls: z.number().optional(),
  recent_summaries: z.array(z.record(z.unknown())).default([]),
  recent_escalations: z.array(z.record(z.unknown())).default([]),
  completeness: z.record(z.boolean()).default({})
});

export const PortalBusinessProfileSchema = z.object({
  legal_business_name: z.string().nullable().optional(),
  public_business_name: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
  service_area_summary: z.string().nullable().optional(),
  primary_contact_name: z.string().nullable().optional(),
  primary_contact_email: z.string().nullable().optional(),
  primary_contact_phone: z.string().nullable().optional(),
  after_hours_instructions: z.string().nullable().optional()
});

export const PortalAgentModeResponseSchema = z.object({
  mode: AgentModeSchema,
  effective_in_live_routing: z.boolean().default(false),
  changed_at: z.string().nullable().optional(),
  changed_by: z.string().nullable().optional(),
  fallback_destination: z.string().nullable().optional()
});

export const PortalAgentModeUpdateSchema = z.object({
  mode: AgentModeSchema,
  reason: z.string().trim().min(1).max(300).optional()
});

export const PortalAuditLogEntrySchema = z.object({
  id: z.string(),
  event_type: z.string(),
  actor: z.string().nullable().optional(),
  timestamp: z.string(),
  previous_value: z.record(z.unknown()).nullable().optional(),
  next_value: z.record(z.unknown()).nullable().optional()
});

export const PortalAuditLogResponseSchema = z.object({
  items: z.array(PortalAuditLogEntrySchema),
  next_cursor: z.string().nullable().optional()
});

export const SessionMeSchema = z.object({
  user_id: z.string().optional(),
  email: z.string().optional(),
  role: z.string().optional(),
  tenant_id: z.string().optional(),
  tenant_name: z.string().optional()
});

export const PlanSchema = z.enum(["starter", "growth", "operator"]);
export const AgreementStatusSchema = z.enum(["draft", "sent", "signed"]);
export const DepositStatusSchema = z.enum(["pending", "paid"]);
export const FinalSetupStatusSchema = z.enum(["pending", "paid", "not_required"]);
export const MonthlyStatusSchema = z.enum(["inactive", "pending", "active"]);
export const PortalInviteStatusSchema = z.enum(["not_sent", "sent", "accepted"]);

export const AdminTenantBootstrapRequestSchema = z.object({
  tenant_name: z.string().min(2),
  tenant_slug: z.string().min(2).optional(),
  owner_email: z.string().email(),
  owner_full_name: z.string().min(2),
  selected_plan: PlanSchema.default("starter"),
  agreement_status: AgreementStatusSchema.default("draft"),
  deposit_status: DepositStatusSchema.default("pending"),
  final_setup_status: FinalSetupStatusSchema.optional(),
  monthly_status: MonthlyStatusSchema.default("inactive"),
  portal_invite_status: PortalInviteStatusSchema.default("not_sent"),
  docusign_envelope_id: z.string().trim().min(1).nullable().optional(),
  onboarding_notes: z.string().trim().min(1).nullable().optional()
});

export const AdminTenantBootstrapResponseSchema = z.object({
  tenant_id: z.string(),
  owner_email: z.string().email(),
  temporary_password: z.string().nullable().optional(),
  password_reset_token: z.string().nullable().optional(),
  invite_token: z.string().nullable().optional(),
  invite_url: z.string().nullable().optional()
});

export const InviteActivationRequestSchema = z.object({
  token: z.string().min(10),
  new_password: z.string().min(8)
});

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email()
});

export const ResetPasswordRequestSchema = z.object({
  token: z.string().min(10),
  new_password: z.string().min(8)
});

export const ChangePasswordRequestSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8)
});

export const BillingPortalLinkResponseSchema = z.object({
  status: z.enum(["not_configured", "configured"]),
  provider: z.string(),
  manage_url: z.string().nullable()
});

export const TenantBillingStateSchema = z.object({
  tenant_id: z.string(),
  tenant_name: z.string().nullable().optional(),
  selected_plan: PlanSchema,
  agreement_status: AgreementStatusSchema,
  deposit_status: DepositStatusSchema,
  final_setup_status: FinalSetupStatusSchema,
  monthly_status: MonthlyStatusSchema,
  stripe_customer_id: z.string().nullable().optional(),
  stripe_subscription_id: z.string().nullable().optional(),
  stripe_product_id_reference: z.string().nullable().optional(),
  stripe_price_id_deposit: z.string().nullable().optional(),
  stripe_price_id_final_setup: z.string().nullable().optional(),
  stripe_price_id_monthly: z.string().nullable().optional(),
  payment_link_deposit: z.string().nullable().optional(),
  payment_link_final_setup: z.string().nullable().optional(),
  docusign_envelope_id: z.string().nullable().optional(),
  portal_invite_status: PortalInviteStatusSchema,
  onboarding_notes: z.string().nullable().optional(),
  updated_at: z.string()
});

export const TenantBillingStateUpdateSchema = z.object({
  tenant_id: z.string(),
  tenant_name: z.string().nullable().optional(),
  selected_plan: PlanSchema.optional(),
  agreement_status: AgreementStatusSchema.optional(),
  deposit_status: DepositStatusSchema.optional(),
  final_setup_status: FinalSetupStatusSchema.optional(),
  monthly_status: MonthlyStatusSchema.optional(),
  stripe_customer_id: z.string().nullable().optional(),
  stripe_subscription_id: z.string().nullable().optional(),
  stripe_product_id_reference: z.string().nullable().optional(),
  stripe_price_id_deposit: z.string().nullable().optional(),
  stripe_price_id_final_setup: z.string().nullable().optional(),
  stripe_price_id_monthly: z.string().nullable().optional(),
  payment_link_deposit: z.string().nullable().optional(),
  payment_link_final_setup: z.string().nullable().optional(),
  docusign_envelope_id: z.string().nullable().optional(),
  portal_invite_status: PortalInviteStatusSchema.optional(),
  onboarding_notes: z.string().nullable().optional()
});

export const TenantBillingStateListResponseSchema = z.object({
  items: z.array(TenantBillingStateSchema)
});

export type AgentMode = z.infer<typeof AgentModeSchema>;
export type PortalDashboard = z.infer<typeof PortalDashboardSchema>;
export type PortalBusinessProfile = z.infer<typeof PortalBusinessProfileSchema>;
export type PortalAgentModeResponse = z.infer<typeof PortalAgentModeResponseSchema>;
export type PortalAgentModeUpdate = z.infer<typeof PortalAgentModeUpdateSchema>;
export type PortalAuditLogEntry = z.infer<typeof PortalAuditLogEntrySchema>;
export type PortalAuditLogResponse = z.infer<typeof PortalAuditLogResponseSchema>;
export type SessionMe = z.infer<typeof SessionMeSchema>;
export type AdminTenantBootstrapRequest = z.infer<typeof AdminTenantBootstrapRequestSchema>;
export type AdminTenantBootstrapResponse = z.infer<typeof AdminTenantBootstrapResponseSchema>;
export type InviteActivationRequest = z.infer<typeof InviteActivationRequestSchema>;
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;
export type BillingPortalLinkResponse = z.infer<typeof BillingPortalLinkResponseSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type TenantBillingState = z.infer<typeof TenantBillingStateSchema>;
export type TenantBillingStateUpdate = z.infer<typeof TenantBillingStateUpdateSchema>;
