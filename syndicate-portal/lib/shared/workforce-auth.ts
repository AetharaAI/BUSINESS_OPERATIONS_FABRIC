import { SessionMe, TenantBillingState } from "@/lib/types/portal";

export const WORKFORCE_ROLES = ["customer", "internal_sales_rep", "internal_operator", "platform_admin"] as const;
export type WorkforceRole = (typeof WORKFORCE_ROLES)[number];

export const INTERNAL_CAPABILITIES = [
  "tenant.create_draft",
  "tenant.create",
  "tenant.owner_invite.create",
  "tenant.owner_invite.resend",
  "tenant.onboarding.read_own",
  "tenant.onboarding.read_all",
  "tenant.onboarding.update_own",
  "tenant.onboarding.update_all",
  "lead.create",
  "lead.read_own",
  "lead.update_own",
  "customer_profile.create_initial",
  "agreement.status.read",
  "payment.status.read",
  "approved_offer.read",
  "contact.create",
  "contact.read",
  "company.create",
  "company.read",
  "deal.create",
  "deal.read",
  "deal.stage.update",
  "contract.create_draft",
  "contract.read",
  "contract.generate",
  "contract.send",
  "contract.modify_legal_terms",
  "audit.read_own_actions",
  "audit.read_all"
] as const;
export type InternalCapability = (typeof INTERNAL_CAPABILITIES)[number];

export const TENANT_SCOPE_MODES = ["none", "create_and_assigned_only", "all"] as const;
export type TenantScopeMode = (typeof TENANT_SCOPE_MODES)[number];

const SALES_REP_CAPABILITIES: InternalCapability[] = [
  "tenant.create_draft",
  "tenant.create",
  "tenant.owner_invite.create",
  "tenant.owner_invite.resend",
  "tenant.onboarding.read_own",
  "tenant.onboarding.update_own",
  "lead.create",
  "lead.read_own",
  "lead.update_own",
  "customer_profile.create_initial",
  "agreement.status.read",
  "payment.status.read",
  "approved_offer.read",
  "contact.create",
  "contact.read",
  "company.create",
  "company.read",
  "deal.create",
  "deal.read",
  "deal.stage.update",
  "contract.create_draft",
  "contract.read",
  "contract.generate",
  "audit.read_own_actions"
];

const OPERATOR_CAPABILITIES: InternalCapability[] = [
  ...SALES_REP_CAPABILITIES,
  "contract.send",
  "contract.modify_legal_terms",
  "tenant.onboarding.read_all",
  "tenant.onboarding.update_all",
  "audit.read_all"
];

const PLATFORM_ADMIN_CAPABILITIES: InternalCapability[] = [...OPERATOR_CAPABILITIES];

export const normalizeWorkforceRole = (value: string | null | undefined): WorkforceRole | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return WORKFORCE_ROLES.find((role) => role === normalized) ?? null;
};

export const normalizeTenantScopeMode = (value: string | null | undefined): TenantScopeMode | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return TENANT_SCOPE_MODES.find((mode) => mode === normalized) ?? null;
};

export const normalizeCapability = (value: string | null | undefined): InternalCapability | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return INTERNAL_CAPABILITIES.find((capability) => capability === normalized) ?? null;
};

export const normalizeCapabilityScope = (value: unknown): InternalCapability[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const deduped = new Set<InternalCapability>();
  for (const item of value) {
    const normalized = normalizeCapability(typeof item === "string" ? item : null);
    if (normalized) {
      deduped.add(normalized);
    }
  }

  return [...deduped];
};

export const deriveHandleFromEmail = (email: string | null | undefined): string | null => {
  if (typeof email !== "string") {
    return null;
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) {
    return null;
  }

  return normalized.split("@")[0] || null;
};

export const defaultCapabilityScopeForRole = (role: WorkforceRole): InternalCapability[] => {
  switch (role) {
    case "platform_admin":
      return PLATFORM_ADMIN_CAPABILITIES;
    case "internal_operator":
      return OPERATOR_CAPABILITIES;
    case "internal_sales_rep":
      return SALES_REP_CAPABILITIES;
    default:
      return [];
  }
};

export const defaultTenantScopeModeForRole = (role: WorkforceRole): TenantScopeMode => {
  switch (role) {
    case "platform_admin":
    case "internal_operator":
      return "all";
    case "internal_sales_rep":
      return "create_and_assigned_only";
    default:
      return "none";
  }
};

export const hasCapability = (
  me: Pick<SessionMe, "capability_scope"> | null | undefined,
  capability: InternalCapability
): boolean => {
  const scope = normalizeCapabilityScope(me?.capability_scope ?? []);
  return scope.includes(capability);
};

const candidateIdentifiers = (me: Pick<SessionMe, "user_id" | "subject" | "email" | "handle">): string[] => {
  const identifiers = [
    me.user_id,
    me.subject,
    me.email ? me.email.trim().toLowerCase() : null,
    me.handle ? me.handle.trim().toLowerCase() : null,
    deriveHandleFromEmail(me.email)
  ];

  return identifiers.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
};

export const canAccessOnboardingSurface = (me: SessionMe | null | undefined): boolean =>
  hasCapability(me, "tenant.create") ||
  hasCapability(me, "tenant.onboarding.read_all") ||
  hasCapability(me, "tenant.onboarding.read_own");

export const canReadAuditLog = (me: SessionMe | null | undefined): boolean =>
  hasCapability(me, "audit.read_all") || hasCapability(me, "audit.read_own_actions");

export const canReadAllAuditLog = (me: SessionMe | null | undefined): boolean => hasCapability(me, "audit.read_all");

export const canManageOnboardingOperations = (me: SessionMe | null | undefined): boolean =>
  hasCapability(me, "tenant.onboarding.update_all");

export const canTrackExistingTenants = (me: SessionMe | null | undefined): boolean =>
  canManageOnboardingOperations(me);

export const canAccessTenantState = (
  me: Pick<
    SessionMe,
    "user_id" | "subject" | "email" | "handle" | "capability_scope" | "tenant_scope_mode"
  > | null | undefined,
  state: Pick<
    TenantBillingState,
    "created_by_user_id" | "created_by_subject" | "sales_rep_id" | "sales_rep_email" | "sales_rep_handle" | "assigned_user_ids"
  >
): boolean => {
  if (!me) {
    return false;
  }

  if (hasCapability(me, "tenant.onboarding.read_all") || hasCapability(me, "tenant.onboarding.update_all")) {
    return true;
  }

  if (normalizeTenantScopeMode(me.tenant_scope_mode) !== "create_and_assigned_only") {
    return false;
  }

  const identifiers = new Set(candidateIdentifiers(me));
  const assignedUsers = Array.isArray(state.assigned_user_ids) ? state.assigned_user_ids : [];
  const stateIdentifiers = [
    state.created_by_user_id,
    state.created_by_subject,
    state.sales_rep_id,
    state.sales_rep_email ? state.sales_rep_email.trim().toLowerCase() : null,
    state.sales_rep_handle ? state.sales_rep_handle.trim().toLowerCase() : null,
    ...assignedUsers
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  return stateIdentifiers.some((value) => identifiers.has(value));
};
