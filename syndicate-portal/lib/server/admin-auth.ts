import { readSessionToken } from "@/lib/server/session";
import { voiceOpsRequest } from "@/lib/server/voiceops-client";
import { SessionMe, SessionMeSchema } from "@/lib/types/portal";
import { serverEnv } from "@/lib/server/env";
import { unwrapVoiceOpsPayload } from "@/lib/server/response-shape";

const parseAllowlist = (raw: string): Set<string> =>
  new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );

export const isInternalAdmin = (me: SessionMe): boolean => {
  const email = (me.email || "").toLowerCase();
  const allowlist = parseAllowlist(serverEnv.portalAdminEmailAllowlist);

  // Single authority: email allowlist controls internal admin access.
  // This keeps behavior deterministic for portal admin controls.
  if (allowlist.size === 0) return false;
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
  const allowed = isInternalAdmin(parsedMe);

  if (!allowed) {
    console.info("[portal-authz] admin denied", {
      email: parsedMe.email ?? null,
      role: parsedMe.role ?? null,
      isInternalAdmin: allowed
    });
    throw new Error("Forbidden");
  }

  console.info("[portal-authz] admin granted", {
    email: parsedMe.email ?? null,
    role: parsedMe.role ?? null,
    isInternalAdmin: allowed
  });

  return { token, me: parsedMe };
};
