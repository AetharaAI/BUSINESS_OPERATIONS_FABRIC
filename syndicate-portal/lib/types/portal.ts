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

export type AgentMode = z.infer<typeof AgentModeSchema>;
export type PortalDashboard = z.infer<typeof PortalDashboardSchema>;
export type PortalBusinessProfile = z.infer<typeof PortalBusinessProfileSchema>;
export type PortalAgentModeResponse = z.infer<typeof PortalAgentModeResponseSchema>;
export type PortalAgentModeUpdate = z.infer<typeof PortalAgentModeUpdateSchema>;
export type PortalAuditLogEntry = z.infer<typeof PortalAuditLogEntrySchema>;
export type PortalAuditLogResponse = z.infer<typeof PortalAuditLogResponseSchema>;
export type SessionMe = z.infer<typeof SessionMeSchema>;
