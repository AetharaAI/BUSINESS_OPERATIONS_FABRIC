import { SessionMe } from "@/lib/types/portal";
import { workforceService } from "@/lib/server/workforce/service";
import { resolveWorkforceIdentity as resolveWorkforceIdentityFromOverlay } from "@/lib/server/workforce-directory";

const optionalString = (value: unknown): string | null => (typeof value === "string" ? value : null);

export const resolveEffectiveWorkforceSession = async (
  me: SessionMe,
  raw: Record<string, unknown>
): Promise<SessionMe> => {
  const persistent = await workforceService.resolveWorkforceIdentity(me, raw);
  const workforce = persistent ?? resolveWorkforceIdentityFromOverlay(me, raw);

  return {
    ...me,
    subject: workforce.subject,
    handle: workforce.handle,
    workforce_role: workforce.workforce_role,
    capability_scope: workforce.capability_scope,
    tenant_scope_mode: workforce.tenant_scope_mode,
    person_id: "person_id" in workforce ? optionalString(workforce.person_id) : null,
    workspace_id: "workspace_id" in workforce ? optionalString(workforce.workspace_id) : null,
    tenant_id: "tenant_id" in workforce ? optionalString(workforce.tenant_id) ?? me.tenant_id ?? null : me.tenant_id ?? null
  };
};
