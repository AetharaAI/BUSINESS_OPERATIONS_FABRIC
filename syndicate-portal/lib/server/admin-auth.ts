import { readSessionToken } from "@/lib/server/session";
import { voiceOpsRequest } from "@/lib/server/voiceops-client";
import { SessionMe, SessionMeSchema } from "@/lib/types/portal";
import { serverEnv } from "@/lib/server/env";
import { unwrapVoiceOpsPayload } from "@/lib/server/response-shape";

const ADMIN_ROLES = new Set([
  "platform_admin",
  "admin",
  "owner",
  // Compatibility with additive role models in portal docs.
  "tenant_owner",
  "tenant_manager"
]);

const parseAllowlist = (raw: string): Set<string> =>
  new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );

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

  const role = (parsedMe.role || "").toLowerCase();
  if (!ADMIN_ROLES.has(role)) {
    throw new Error("Forbidden");
  }

  const allowlist = parseAllowlist(serverEnv.portalAdminEmailAllowlist);
  if (allowlist.size > 0) {
    const email = (parsedMe.email || "").toLowerCase();
    if (!allowlist.has(email)) {
      throw new Error("Forbidden");
    }
  }

  return { token, me: parsedMe };
};
