import { SessionMe } from "@/lib/types/portal";

export const canEditAgentMode = (me: SessionMe | null): boolean => {
  if (!me?.role) {
    return false;
  }

  const role = me.role.toLowerCase();
  return role === "owner" || role === "admin";
};

export const canViewInternalAdmin = (me: SessionMe | null): boolean => {
  return me?.is_internal_admin === true;
};

export const canViewAuditLog = (me: SessionMe | null): boolean => canViewInternalAdmin(me);
