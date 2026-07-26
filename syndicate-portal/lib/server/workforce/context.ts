import { SessionMe } from "@/lib/types/portal";
import { serverEnv } from "@/lib/server/env";
import { CrmRequestContext } from "@/lib/server/crm/request-context";

export type WorkforceContext = {
  workspaceId: string;
  tenantId: string;
};

export const resolveWorkforceContext = (session?: Pick<SessionMe, "tenant_id"> | null): WorkforceContext => {
  const workspaceId = serverEnv.bofWorkspaceId || session?.tenant_id || serverEnv.bofTenantId;
  const tenantId = serverEnv.bofTenantId || session?.tenant_id || serverEnv.bofWorkspaceId;

  if (!workspaceId || !tenantId) {
    throw new Error("Workforce workspace context is not configured");
  }

  return { workspaceId, tenantId };
};

export const toCrmRequestContext = (context: WorkforceContext): CrmRequestContext => ({
  workspace_id: context.workspaceId,
  tenant_id: context.tenantId
});
