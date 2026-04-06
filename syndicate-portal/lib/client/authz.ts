import { SessionMe } from "@/lib/types/portal";

export const canEditAgentMode = (me: SessionMe | null): boolean => {
  if (!me?.role) {
    return false;
  }

  const role = me.role.toLowerCase();
  return role === "owner" || role === "admin";
};
