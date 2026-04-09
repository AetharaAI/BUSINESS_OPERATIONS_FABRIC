import { readSessionToken } from "@/lib/server/session";
import { voiceOpsRequest } from "@/lib/server/voiceops-client";
import { SessionMe, SessionMeSchema } from "@/lib/types/portal";
import { serverEnv } from "@/lib/server/env";
import { unwrapVoiceOpsPayload } from "@/lib/server/response-shape";

const INTERNAL_ADMIN_ROLES = new Set(["platform_admin", "admin"]);

const parseAllowlist = (raw: string): Set<string> =>
  new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );

export const isInternalAdminUser = (me: SessionMe): boolean => {
  const role = (me.role || "").toLowerCase();
  const email = (me.email || "").toLowerCase();
  const allowlist = parseAllowlist(serverEnv.portalAdminEmailAllowlist);

  // If an internal operator email is explicitly allowlisted, treat it as internal admin.
  if (allowlist.size > 0 && allowlist.has(email)) {
    return true;
  }

  if (!INTERNAL_ADMIN_ROLES.has(role)) {
    return false;
  }

  // Default behavior: role-based admin access. This avoids accidental lockout.
  if (!serverEnv.portalEnforceAdminAllowlist) {
    return true;
  }

  // Strict mode: if enabled, internal admin role must also be in allowlist (when provided).
  if (allowlist.size === 0) {
    return true;
  }
  return allowlist.has(email);
};

export const requireAdminSession = async (): Promise<{ token: string; me: SessionMe }> => {
  const token = await readSessionToken();
  if (!token) {
    throw new Error("Unauthorized");
  }

  const mePayload = await voiceOpsRequest<unknown>({
    method: "GET",
    path: "/api/v1/auth/me",
    token
  });
  const parsedMe = SessionMeSchema.parse(unwrapVoiceOpsPayload(mePayload));

  if (!isInternalAdminUser(parsedMe)) {
    throw new Error("Forbidden");
  }

  return { token, me: parsedMe };
};
