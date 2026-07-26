import { z } from "zod";

export const AiWebsiteOfferKeySchema = z.enum(["ai_website_wedge"]);
export const WebsiteProvisioningTriggerSchema = z.enum(["confirmed_close", "payment_confirmed"]);
export const WebsiteProvisioningPaymentStateSchema = z.enum(["pending", "paid"]);
export const WebsiteProvisioningTaskStatusSchema = z.enum(["blocked", "open", "in_progress", "completed", "cancelled"]);
export const WebsiteProvisioningStepSchema = z.enum([
  "awaiting_payment",
  "ready_for_provisioning",
  "in_progress",
  "completed",
  "cancelled"
]);

const OptionalTextSchema = z.string().trim().optional().or(z.literal("")).transform((value) => value || undefined);

export const WebsiteProvisioningUpsertRequestSchema = z.object({
  tenant_id: z.string().uuid(),
  business_name: z.string().trim().min(2),
  primary_contact_name: z.string().trim().min(2),
  primary_contact_email: z.string().trim().email(),
  primary_contact_phone: z.string().trim().min(3),
  deployment_family: z.literal("ai-website").default("ai-website"),
  offer_key: AiWebsiteOfferKeySchema.default("ai_website_wedge"),
  trigger_kind: WebsiteProvisioningTriggerSchema,
  website_domain: OptionalTextSchema,
  website_objective: OptionalTextSchema,
  promised_capabilities: z.array(z.string().trim().min(1)).default([]),
  timeline_discussed: OptionalTextSchema,
  escalations_or_caveats: OptionalTextSchema,
  payment_reference: OptionalTextSchema,
  next_customer_action: OptionalTextSchema,
  next_aetherpro_action: OptionalTextSchema,
  accountable_owner: OptionalTextSchema
});

export const WebsiteProvisioningStatusUpdateSchema = z.object({
  tenant_id: z.string().uuid(),
  task_id: z.string().uuid(),
  task_status: WebsiteProvisioningTaskStatusSchema,
  current_step: WebsiteProvisioningStepSchema,
  next_operator_action: z.string().trim().min(2),
  operator_note: OptionalTextSchema
});

export const WebsiteProvisioningReceiptSummarySchema = z.object({
  id: z.string().uuid(),
  action: z.string(),
  result: z.string(),
  created_at: z.string()
});

export const WebsiteOfferCatalogSchema = z.object({
  deployment_family: z.literal("ai-website"),
  offer_key: AiWebsiteOfferKeySchema,
  offer_label: z.string(),
  build_price_cents: z.number().int().nonnegative(),
  monthly_price_cents: z.number().int().nonnegative(),
  payment_link_build: z.string().nullable(),
  payment_link_monthly: z.string().nullable(),
  pricing_status: z.enum(["configured", "missing_payment_links"]),
  promo_note: z.string().nullable(),
  operator_guidance: z.string()
});

export const WebsiteProvisioningSummarySchema = z.object({
  tenant_id: z.string().uuid(),
  company_id: z.string().uuid(),
  primary_contact_id: z.string().uuid(),
  deal_id: z.string().uuid(),
  task_id: z.string().uuid(),
  business_name: z.string(),
  primary_contact_name: z.string(),
  primary_contact_email: z.string().email(),
  primary_contact_phone: z.string(),
  deployment_family: z.literal("ai-website"),
  offer_key: AiWebsiteOfferKeySchema,
  offer_label: z.string(),
  build_price_cents: z.number().int().nonnegative(),
  monthly_price_cents: z.number().int().nonnegative(),
  trigger_kind: WebsiteProvisioningTriggerSchema,
  payment_state: WebsiteProvisioningPaymentStateSchema,
  task_status: WebsiteProvisioningTaskStatusSchema,
  current_step: WebsiteProvisioningStepSchema,
  next_operator_action: z.string(),
  website_domain: z.string().nullable(),
  website_objective: z.string().nullable(),
  promised_capabilities: z.array(z.string()),
  timeline_discussed: z.string().nullable(),
  escalations_or_caveats: z.string().nullable(),
  payment_reference: z.string().nullable(),
  next_customer_action: z.string().nullable(),
  next_aetherpro_action: z.string().nullable(),
  accountable_owner: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  latest_evidence: z.array(WebsiteProvisioningReceiptSummarySchema).default([])
});

export const WebsiteProvisioningGetResponseSchema = z.object({
  item: WebsiteProvisioningSummarySchema.nullable(),
  catalog: WebsiteOfferCatalogSchema
});

export type AiWebsiteOfferKey = z.infer<typeof AiWebsiteOfferKeySchema>;
export type WebsiteProvisioningTrigger = z.infer<typeof WebsiteProvisioningTriggerSchema>;
export type WebsiteProvisioningPaymentState = z.infer<typeof WebsiteProvisioningPaymentStateSchema>;
export type WebsiteProvisioningTaskStatus = z.infer<typeof WebsiteProvisioningTaskStatusSchema>;
export type WebsiteProvisioningStep = z.infer<typeof WebsiteProvisioningStepSchema>;
export type WebsiteProvisioningUpsertRequest = z.infer<typeof WebsiteProvisioningUpsertRequestSchema>;
export type WebsiteProvisioningStatusUpdateRequest = z.infer<typeof WebsiteProvisioningStatusUpdateSchema>;
export type WebsiteProvisioningReceiptSummary = z.infer<typeof WebsiteProvisioningReceiptSummarySchema>;
export type WebsiteOfferCatalog = z.infer<typeof WebsiteOfferCatalogSchema>;
export type WebsiteProvisioningSummary = z.infer<typeof WebsiteProvisioningSummarySchema>;
