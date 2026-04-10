import { SessionMe } from "@/lib/types/portal";

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

  return me.is_platform_admin === true || normalizeRole(me.role) === "admin";
};
