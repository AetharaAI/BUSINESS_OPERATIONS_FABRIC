import { SessionMe } from "@/lib/types/portal";

export const isInternalAdmin = (me: Pick<SessionMe, "role"> | null | undefined): boolean => {
  if (!me?.role || typeof me.role !== "string") {
    return false;
  }
  return me.role.trim().toLowerCase() === "admin";
};
