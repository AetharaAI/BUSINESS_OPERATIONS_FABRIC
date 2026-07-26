import { SessionMe } from "@/lib/types/portal";
import { normalizeWorkforceRole } from "@/lib/shared/workforce-auth";

const normalizeRole = (role: string | null | undefined): string | null => {
  if (typeof role !== "string") {
    return null;
  }

  const normalized = role.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

export const isInternalAdmin = (me: Pick<SessionMe, "is_platform_admin" | "role"> | null | undefined): boolean => {
  if (!me) {
    return false;
  }

  const workforceRole = normalizeWorkforceRole((me as SessionMe).workforce_role);
  return (
    workforceRole === "platform_admin" ||
    workforceRole === "internal_operator" ||
    me.is_platform_admin === true ||
    normalizeRole(me.role) === "admin"
  );
};
