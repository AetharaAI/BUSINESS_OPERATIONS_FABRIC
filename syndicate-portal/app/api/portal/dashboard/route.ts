import { NextResponse } from "next/server";
import { readSessionToken } from "@/lib/server/session";
import { voiceOpsRequest } from "@/lib/server/voiceops-client";
import { PortalDashboardSchema } from "@/lib/types/portal";
import { safeRouteError, unauthorized } from "@/app/api/_lib/route-utils";
import { unwrapVoiceOpsPayload } from "@/lib/server/response-shape";

const getNumber = (value: unknown): number | undefined => (typeof value === "number" ? value : undefined);
const getBoolean = (value: unknown): boolean | undefined => (typeof value === "boolean" ? value : undefined);
const getString = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);
const getArray = (value: unknown): Array<Record<string, unknown>> | undefined =>
  Array.isArray(value) ? (value as Array<Record<string, unknown>>) : undefined;
const getBooleanRecord = (value: unknown): Record<string, boolean> | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const out: Record<string, boolean> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "boolean") out[key] = raw;
  }
  return out;
};

const normalizeDashboardPayload = (raw: unknown): unknown => {
  if (!raw || typeof raw !== "object") {
    return raw;
  }

  const root = raw as Record<string, unknown>;
  const metrics = (root.metrics && typeof root.metrics === "object" ? root.metrics : {}) as Record<string, unknown>;
  const agentMode =
    root.agent_mode && typeof root.agent_mode === "object" ? (root.agent_mode as Record<string, unknown>) : {};

  const mode =
    getString(root.mode) ??
    getString(root.current_mode) ??
    getString(agentMode.mode) ??
    // Fallback to a safe value rather than hard-failing on new response shapes.
    "enabled";

  return {
    tenant_id: getString(root.tenant_id),
    tenant_name: getString(root.tenant_name),
    mode,
    effective_in_live_routing:
      getBoolean(root.effective_in_live_routing) ??
      getBoolean(agentMode.effective_in_live_routing) ??
      false,
    today_calls: getNumber(root.today_calls) ?? getNumber(metrics.today_calls),
    seven_day_calls: getNumber(root.seven_day_calls) ?? getNumber(metrics.seven_day_calls),
    recent_summaries: getArray(root.recent_summaries) ?? [],
    recent_escalations: getArray(root.recent_escalations) ?? [],
    completeness: getBooleanRecord(root.completeness) ?? {}
  };
};

export async function GET(): Promise<NextResponse> {
  try {
    const token = await readSessionToken();

    if (!token) {
      return unauthorized();
    }

    const payload = await voiceOpsRequest<unknown>({
      method: "GET",
      path: "/api/v1/portal/dashboard",
      token
    });

    const parsed = PortalDashboardSchema.safeParse(normalizeDashboardPayload(unwrapVoiceOpsPayload(payload)));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid dashboard response from VoiceOps", details: parsed.error.flatten() },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed.data);
  } catch (error) {
    return safeRouteError(error);
  }
}
