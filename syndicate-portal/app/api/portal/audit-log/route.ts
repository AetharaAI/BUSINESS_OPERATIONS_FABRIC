import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/admin-auth";
import { voiceOpsRequest } from "@/lib/server/voiceops-client";
import { PortalAuditLogResponseSchema } from "@/lib/types/portal";
import { safeRouteError } from "@/app/api/_lib/route-utils";
import { unwrapVoiceOpsPayload } from "@/lib/server/response-shape";

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const asString = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value : null);
const firstArray = (...values: unknown[]): unknown[] => {
  for (const value of values) {
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
};

const normalizeAuditItem = (raw: unknown, index: number): Record<string, unknown> => {
  const item = asObject(raw) ?? {};
  const eventType = asString(item.event_type) ?? asString(item.type) ?? asString(item.action) ?? "event";
  const timestamp =
    asString(item.timestamp) ?? asString(item.created_at) ?? asString(item.at) ?? new Date(0).toISOString();
  const id =
    asString(item.id) ??
    asString(item.event_id) ??
    asString(item.audit_id) ??
    `${timestamp}:${eventType}:${index}`;

  return {
    id,
    event_type: eventType,
    actor: asString(item.actor) ?? asString(item.actor_email) ?? asString(item.user_email) ?? null,
    timestamp,
    previous_value:
      (asObject(item.previous_value) ??
        asObject(item.previous) ??
        asObject(item.before) ??
        asObject(item.old_value)) ??
      null,
    next_value:
      (asObject(item.next_value) ?? asObject(item.next) ?? asObject(item.after) ?? asObject(item.new_value)) ??
      null
  };
};

const normalizeAuditPayload = (payload: unknown): unknown => {
  const root = asObject(payload) ?? {};
  const rawItems = firstArray(root.items, root.logs, root.entries, root.audit_log, root.events);
  const items = rawItems.map((item, index) => normalizeAuditItem(item, index));
  const nextCursor = asString(root.next_cursor) ?? asString(root.cursor) ?? null;
  return { items, next_cursor: nextCursor };
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { token } = await requireAdminSession();

    const search = request.nextUrl.searchParams;
    const limit = search.get("limit");
    const since = search.get("since");
    const actor = search.get("actor");
    const eventType = search.get("event_type");

    const voiceOpsParams = new URLSearchParams();
    if (limit) voiceOpsParams.set("limit", limit);
    if (since) voiceOpsParams.set("since", since);
    if (actor) voiceOpsParams.set("actor", actor);
    if (eventType) voiceOpsParams.set("event_type", eventType);

    const path = `/api/v1/portal/audit-log${
      voiceOpsParams.toString() ? `?${voiceOpsParams.toString()}` : ""
    }`;

    const payload = await voiceOpsRequest<unknown>({
      method: "GET",
      path,
      token
    });

    const parsed = PortalAuditLogResponseSchema.safeParse(normalizeAuditPayload(unwrapVoiceOpsPayload(payload)));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid audit log response from VoiceOps", details: parsed.error.flatten() },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed.data);
  } catch (error) {
    return safeRouteError(error);
  }
}
