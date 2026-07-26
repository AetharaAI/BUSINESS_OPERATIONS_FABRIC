import {
  AdminTenantBootstrapRequest,
  AdminTenantBootstrapResponse,
  AdminTenantBootstrapResponseSchema,
  BillingPortalLinkResponse,
  BillingPortalLinkResponseSchema,
  ChangePasswordRequest,
  ChangePasswordRequestSchema,
  ForgotPasswordRequest,
  ForgotPasswordRequestSchema,
  InviteActivationRequest,
  TenantBillingState,
  TenantBillingStateListResponseSchema,
  TenantBillingStateSchema,
  TenantBillingStateUpdate,
  PortalAgentModeResponse,
  PortalAgentModeResponseSchema,
  PortalAgentModeUpdate,
  PortalAuditLogResponse,
  PortalAuditLogResponseSchema,
  PortalBusinessProfile,
  PortalBusinessProfileSchema,
  PortalDashboard,
  PortalDashboardSchema,
  ResetPasswordRequest,
  ResetPasswordRequestSchema,
  SessionMe,
  SessionMeSchema
} from "@/lib/types/portal";
import {
  ComplianceDocumentRequirementSchema,
  WorkforceDocumentUploadResponse,
  WorkforceDocumentUploadResponseSchema,
  WorkforceInviteResponse,
  WorkforceInviteResponseSchema,
  WorkforceOnboardingBundle,
  WorkforceOnboardingBundleListSchema,
  WorkforceOnboardingBundleSchema,
  WorkforceOnboardingUpsertRequest,
  WorkforceSuggestion,
  WorkforceSuggestionListSchema,
  WorkforceVerifyRequirementRequest
} from "@/lib/types/workforce";
import {
  WebsiteOfferCatalog,
  WebsiteProvisioningGetResponseSchema,
  WebsiteProvisioningStatusUpdateRequest,
  WebsiteProvisioningSummary,
  WebsiteProvisioningSummarySchema,
  WebsiteProvisioningUpsertRequest
} from "@/lib/types/website-provisioning";

export class PortalApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "PortalApiError";
    this.status = status;
    this.details = details;
  }
}

const jsonRequest = async <T>(
  path: string,
  options: RequestInit,
  parse: (payload: unknown) => T
): Promise<T> => {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    },
    credentials: "include"
  });

  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error?: unknown }).error)
        : `Request failed: ${path}`;

    throw new PortalApiError(message, response.status, payload);
  }

  return parse(payload);
};

const formRequest = async <T>(path: string, body: FormData, parse: (payload: unknown) => T): Promise<T> => {
  const response = await fetch(path, {
    method: "POST",
    body,
    credentials: "include"
  });

  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error?: unknown }).error)
        : `Request failed: ${path}`;

    throw new PortalApiError(message, response.status, payload);
  }

  return parse(payload);
};

const mapPasswordApiError = (error: unknown, operation: "reset" | "change"): never => {
  if (!(error instanceof PortalApiError)) {
    throw error;
  }

  if (error.status === 400) {
    throw new PortalApiError(
      operation === "reset"
        ? "Invalid or expired reset token. Request a new reset link and try again."
        : "Password update failed. Check your input and use a new password.",
      error.status,
      error.details
    );
  }

  if (operation === "change" && error.status === 401) {
    throw new PortalApiError("Current password is incorrect.", error.status, error.details);
  }

  throw error;
};

export const portalApi = {
  login: (email: string, password: string): Promise<{ ok: true }> =>
    jsonRequest("/api/session/login", { method: "POST", body: JSON.stringify({ email, password }) }, (payload) => {
      if (!payload || typeof payload !== "object" || (payload as { ok?: boolean }).ok !== true) {
        throw new Error("Unexpected login response");
      }

      return { ok: true };
    }),

  logout: (): Promise<{ ok: true }> =>
    jsonRequest("/api/session/logout", { method: "POST" }, (payload) => {
      if (!payload || typeof payload !== "object" || (payload as { ok?: boolean }).ok !== true) {
        throw new Error("Unexpected logout response");
      }

      return { ok: true };
    }),

  me: (): Promise<SessionMe> =>
    jsonRequest("/api/session/me", { method: "GET" }, (payload) => SessionMeSchema.parse(payload)),

  dashboard: (): Promise<PortalDashboard> =>
    jsonRequest("/api/portal/dashboard", { method: "GET" }, (payload) => PortalDashboardSchema.parse(payload)),

  businessProfile: (): Promise<PortalBusinessProfile> =>
    jsonRequest("/api/portal/business-profile", { method: "GET" }, (payload) =>
      PortalBusinessProfileSchema.parse(payload)
    ),

  agentMode: (): Promise<PortalAgentModeResponse> =>
    jsonRequest("/api/portal/agent-mode", { method: "GET" }, (payload) =>
      PortalAgentModeResponseSchema.parse(payload)
    ),

  updateAgentMode: (update: PortalAgentModeUpdate): Promise<PortalAgentModeResponse> =>
    jsonRequest(
      "/api/portal/agent-mode",
      { method: "PUT", body: JSON.stringify(update) },
      (payload) => PortalAgentModeResponseSchema.parse(payload)
    ),

  auditLog: (query?: { limit?: number; actor?: string; since?: string; eventType?: string }): Promise<PortalAuditLogResponse> => {
    const params = new URLSearchParams();
    if (query?.limit) params.set("limit", String(query.limit));
    if (query?.actor) params.set("actor", query.actor);
    if (query?.since) params.set("since", query.since);
    if (query?.eventType) params.set("event_type", query.eventType);

    const path = `/api/portal/audit-log${params.toString() ? `?${params.toString()}` : ""}`;

    return jsonRequest(path, { method: "GET" }, (payload) => PortalAuditLogResponseSchema.parse(payload));
  },

  adminBootstrapTenant: (input: AdminTenantBootstrapRequest): Promise<AdminTenantBootstrapResponse> =>
    jsonRequest("/api/admin/tenant-bootstrap", { method: "POST", body: JSON.stringify(input) }, (payload) =>
      AdminTenantBootstrapResponseSchema.parse(payload)
    ),

  activateInvite: (input: InviteActivationRequest): Promise<{ ok: true }> =>
    jsonRequest("/api/admin/activate-invite", { method: "POST", body: JSON.stringify(input) }, (payload) => {
      if (!payload || typeof payload !== "object" || (payload as { ok?: boolean }).ok !== true) {
        throw new Error("Unexpected activation response");
      }
      return { ok: true };
    }),

  forgotPassword: async (input: ForgotPasswordRequest): Promise<{ ok: true }> => {
    const parsedInput = ForgotPasswordRequestSchema.parse(input);
    await jsonRequest("/api/session/forgot-password", { method: "POST", body: JSON.stringify(parsedInput) }, () => ({ ok: true }));
    return { ok: true };
  },

  resetPassword: async (input: ResetPasswordRequest): Promise<{ ok: true }> => {
    const parsedInput = ResetPasswordRequestSchema.parse(input);
    await jsonRequest("/api/session/reset-password", { method: "POST", body: JSON.stringify(parsedInput) }, () => ({ ok: true })).catch(
      (error) => mapPasswordApiError(error, "reset")
    );
    return { ok: true };
  },

  changePassword: async (input: ChangePasswordRequest): Promise<{ ok: true }> => {
    const parsedInput = ChangePasswordRequestSchema.parse(input);
    await jsonRequest("/api/session/change-password", { method: "POST", body: JSON.stringify(parsedInput) }, () => ({ ok: true })).catch(
      (error) => mapPasswordApiError(error, "change")
    );
    return { ok: true };
  },

  billingLink: (): Promise<BillingPortalLinkResponse> =>
    jsonRequest("/api/portal/billing-link", { method: "GET" }, (payload) => BillingPortalLinkResponseSchema.parse(payload)),

  listOnboardingStates: (): Promise<TenantBillingState[]> =>
    jsonRequest("/api/admin/onboarding-state", { method: "GET" }, (payload) => TenantBillingStateListResponseSchema.parse(payload).items),

  ensureOnboardingState: (payload: { tenant_id: string; tenant_name?: string; selected_plan?: string }): Promise<TenantBillingState> =>
    jsonRequest("/api/admin/onboarding-state", { method: "POST", body: JSON.stringify(payload) }, (responsePayload) =>
      TenantBillingStateSchema.parse(responsePayload)
    ),

  updateOnboardingState: (payload: TenantBillingStateUpdate): Promise<TenantBillingState> =>
    jsonRequest("/api/admin/onboarding-state", { method: "PUT", body: JSON.stringify(payload) }, (responsePayload) =>
      TenantBillingStateSchema.parse(responsePayload)
    ),

  getWebsiteProvisioning: (tenantId: string): Promise<{ item: WebsiteProvisioningSummary | null; catalog: WebsiteOfferCatalog }> => {
    const params = new URLSearchParams({ tenant_id: tenantId });
    return jsonRequest(`/api/admin/website-provisioning?${params.toString()}`, { method: "GET" }, (payload) =>
      WebsiteProvisioningGetResponseSchema.parse(payload)
    );
  },

  upsertWebsiteProvisioning: (payload: WebsiteProvisioningUpsertRequest): Promise<WebsiteProvisioningSummary> =>
    jsonRequest("/api/admin/website-provisioning", { method: "POST", body: JSON.stringify(payload) }, (responsePayload) =>
      WebsiteProvisioningSummarySchema.parse(responsePayload)
    ),

  updateWebsiteProvisioningStatus: (
    payload: WebsiteProvisioningStatusUpdateRequest
  ): Promise<WebsiteProvisioningSummary> =>
    jsonRequest("/api/admin/website-provisioning", { method: "PUT", body: JSON.stringify(payload) }, (responsePayload) =>
      WebsiteProvisioningSummarySchema.parse(responsePayload)
    ),

  billingDocuments: (): Promise<
    TenantBillingState & { signed_documents: Array<{ id: string; name: string; url: string }>; invoices: Array<unknown> }
  > =>
    jsonRequest("/api/portal/billing-documents", { method: "GET" }, (payload) => {
      const parsed = payload as Record<string, unknown>;
      const state = TenantBillingStateSchema.parse(parsed);
      return {
        ...state,
        signed_documents: Array.isArray(parsed.signed_documents)
          ? (parsed.signed_documents as Array<{ id: string; name: string; url: string }>)
          : [],
        invoices: Array.isArray(parsed.invoices) ? parsed.invoices : []
      };
    }),

  searchPeopleSuggestions: (query: string, limit = 8): Promise<WorkforceSuggestion[]> => {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    return jsonRequest(`/api/v1/people/suggestions?${params.toString()}`, { method: "GET" }, (payload) =>
      WorkforceSuggestionListSchema.parse(payload).suggestions
    );
  },

  listWorkforceOnboarding: (): Promise<WorkforceOnboardingBundle[]> =>
    jsonRequest("/api/workforce/onboarding", { method: "GET" }, (payload) =>
      WorkforceOnboardingBundleListSchema.parse(payload).items
    ),

  upsertWorkforceOnboarding: (input: WorkforceOnboardingUpsertRequest): Promise<WorkforceOnboardingBundle> =>
    jsonRequest("/api/workforce/onboarding", { method: "POST", body: JSON.stringify(input) }, (payload) =>
      WorkforceOnboardingBundleSchema.parse(payload)
    ),

  sendWorkforceInvite: (onboardingCaseId: string): Promise<WorkforceInviteResponse> =>
    jsonRequest("/api/workforce/invite", { method: "POST", body: JSON.stringify({ onboarding_case_id: onboardingCaseId }) }, (payload) =>
      WorkforceInviteResponseSchema.parse(payload)
    ),

  myWorkforceOnboarding: (): Promise<WorkforceOnboardingBundle> =>
    jsonRequest("/api/workforce/me/onboarding", { method: "GET" }, (payload) =>
      WorkforceOnboardingBundleSchema.parse(payload)
    ),

  uploadOwnWorkforceDocument: (requirementId: string, file: File): Promise<WorkforceDocumentUploadResponse> => {
    const form = new FormData();
    form.set("file", file);
    return formRequest(`/api/workforce/me/requirements/${encodeURIComponent(requirementId)}/upload`, form, (payload) =>
      WorkforceDocumentUploadResponseSchema.parse(payload)
    );
  },

  verifyWorkforceRequirement: (requirementId: string, input: WorkforceVerifyRequirementRequest) =>
    jsonRequest(`/api/workforce/requirements/${encodeURIComponent(requirementId)}/verify`, { method: "POST", body: JSON.stringify(input) }, (payload) =>
      ComplianceDocumentRequirementSchema.parse(payload)
    )
};
