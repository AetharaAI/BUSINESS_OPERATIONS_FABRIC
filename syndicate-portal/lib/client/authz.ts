import { SessionMe } from "@/lib/types/portal";
import { isInternalAdmin as resolveInternalAdmin } from "@/lib/shared/internal-admin";

export const canEditAgentMode = (me: SessionMe | null): boolean => {
  if (!me?.role) {
    return false;
  }

  const role = me.role.toLowerCase();
  return role === "owner" || resolveInternalAdmin(me);
};

export const isInternalAdmin = (me: SessionMe | null): boolean => resolveInternalAdmin(me);

export const canViewInternalAdmin = (me: SessionMe | null): boolean => isInternalAdmin(me);

export const canViewAuditLog = (me: SessionMe | null): boolean => isInternalAdmin(me);
