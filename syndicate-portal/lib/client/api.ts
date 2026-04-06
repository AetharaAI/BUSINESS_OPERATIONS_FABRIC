import {
  PortalAgentModeResponse,
  PortalAgentModeResponseSchema,
  PortalAgentModeUpdate,
  PortalAuditLogResponse,
  PortalAuditLogResponseSchema,
  PortalBusinessProfile,
  PortalBusinessProfileSchema,
  PortalDashboard,
  PortalDashboardSchema,
  SessionMe,
  SessionMeSchema
} from "@/lib/types/portal";

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
  }
};
