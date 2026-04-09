import { readSessionToken } from "@/lib/server/session";
import { voiceOpsRequest } from "@/lib/server/voiceops-client";
import { SessionMe, SessionMeSchema } from "@/lib/types/portal";
import { unwrapVoiceOpsPayload } from "@/lib/server/response-shape";
import { isInternalAdmin } from "@/lib/shared/internal-admin";

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

  if (!parsedMe.email || typeof parsedMe.email !== "string" || !parsedMe.role || typeof parsedMe.role !== "string") {
    console.error("[portal-authz] malformed session payload: missing email/role", {
      email: parsedMe.email ?? null,
      role: parsedMe.role ?? null
    });
    throw new Error("Forbidden");
  }

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
