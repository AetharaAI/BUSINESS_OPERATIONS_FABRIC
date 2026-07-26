import { readSessionToken } from "@/lib/server/session";
import { voiceOpsRequest } from "@/lib/server/voiceops-client";
import { SessionMe, SessionMeSchema } from "@/lib/types/portal";
import { unwrapVoiceOpsPayload } from "@/lib/server/response-shape";
import { InternalCapability, hasCapability } from "@/lib/shared/workforce-auth";
import { resolveEffectiveWorkforceSession } from "@/lib/server/workforce-session";

export const requireWorkforceSession = async (
  requiredCapabilities: InternalCapability | InternalCapability[]
): Promise<{ token: string; me: SessionMe }> => {
  const token = await readSessionToken();
  if (!token) {
    throw new Error("Unauthorized");
  }

  const mePayload = await voiceOpsRequest<unknown>({
    method: "GET",
    path: "/api/v1/auth/me",
    token
  });
  const unwrapped = unwrapVoiceOpsPayload(mePayload);
  const parsedMe = SessionMeSchema.parse(unwrapped);

  if (!parsedMe.email || typeof parsedMe.email !== "string") {
    console.error("[portal-authz] malformed session payload: missing email", {
      email: parsedMe.email ?? null,
      role: parsedMe.role ?? null,
      is_platform_admin: parsedMe.is_platform_admin ?? null
    });
    throw new Error("Forbidden");
  }

  const rawSession = unwrapped && typeof unwrapped === "object" ? (unwrapped as Record<string, unknown>) : {};
  const sessionMe = await resolveEffectiveWorkforceSession(parsedMe, rawSession);
  const required = Array.isArray(requiredCapabilities) ? requiredCapabilities : [requiredCapabilities];
  const allowed = required.some((capability) => hasCapability(sessionMe, capability));

  if (!allowed) {
    console.info("[portal-authz] workforce denied", {
      email: sessionMe.email ?? null,
      role: sessionMe.role ?? null,
      workforce_role: sessionMe.workforce_role ?? null,
      is_platform_admin: sessionMe.is_platform_admin ?? null,
      capability_scope: sessionMe.capability_scope ?? [],
      required_capabilities: required
    });
    throw new Error("Forbidden");
  }

  console.info("[portal-authz] workforce granted", {
    email: sessionMe.email ?? null,
    role: sessionMe.role ?? null,
    workforce_role: sessionMe.workforce_role ?? null,
    is_platform_admin: sessionMe.is_platform_admin ?? null,
    capability_scope: sessionMe.capability_scope ?? [],
    required_capabilities: required
  });

  return { token, me: sessionMe };
};
