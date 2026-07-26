import { z } from "zod";

export const CrmContextSchema = z.object({
  workspace_id: z.string().uuid(),
  tenant_id: z.string().uuid()
});

export const CreateCompanyRequestSchema = CrmContextSchema.extend({
  name: z.string().trim().min(2),
  website: z.string().trim().url().optional().or(z.literal("")).transform((value) => value || undefined),
  industry: z.string().trim().min(1).max(120).optional(),
  notes: z.string().trim().optional()
});

export const CreateContactRequestSchema = CrmContextSchema.extend({
  company_id: z.string().uuid().optional(),
  first_name: z.string().trim().min(1),
  last_name: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().optional(),
  title: z.string().trim().optional(),
  notes: z.string().trim().optional()
});

export const DealStageSchema = z.enum([
  "lead",
  "qualified",
  "proposal_sent",
  "negotiation",
  "closed_won",
  "closed_lost"
]);

export const CreateDealRequestSchema = CrmContextSchema.extend({
  company_id: z.string().uuid().optional(),
  primary_contact_id: z.string().uuid().optional(),
  name: z.string().trim().min(2),
  stage: DealStageSchema.default("lead"),
  amount_cents: z.number().int().nonnegative().optional(),
  currency: z.string().trim().min(3).max(8).default("USD"),
  notes: z.string().trim().optional()
});

export const UpdateDealStageRequestSchema = CrmContextSchema.extend({
  stage: DealStageSchema
});

export const ContractRecipientSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  role: z.string().trim().min(1).default("signer"),
  routing_order: z.number().int().positive().default(1)
});

export const ContractStateSchema = z.enum([
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

export const CreateContractRequestSchema = CrmContextSchema.extend({
  deal_id: z.string().uuid().optional(),
  company_id: z.string().uuid().optional(),
  primary_contact_id: z.string().uuid().optional(),
  title: z.string().trim().min(2),
  approved_template_id: z.string().trim().min(1).optional(),
  contract_value: z.number().nonnegative().optional(),
  currency: z.string().trim().min(3).max(8).default("USD"),
  requires_human_approval_before_send: z.boolean().default(true),
  custom_legal_terms: z.string().trim().optional(),
  target_state: ContractStateSchema.optional(),
  recipients: z.array(ContractRecipientSchema).default([])
});

export const SendContractRequestSchema = CrmContextSchema.extend({
  approved_template_id: z.string().trim().min(1).optional(),
  contract_value: z.number().nonnegative().optional(),
  requires_human_approval_before_send: z.boolean().optional()
});

export const PandadocWebhookPayloadSchema = z.object({
  event: z.string().trim().min(1),
  data: z.object({
    contract_id: z.string().uuid(),
    workspace_id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    external_contract_id: z.string().trim().optional(),
    document_url: z.string().trim().url().optional()
  })
});

export type DealStage = z.infer<typeof DealStageSchema>;
export type ContractState = z.infer<typeof ContractStateSchema>;
