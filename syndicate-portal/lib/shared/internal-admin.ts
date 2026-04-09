import { SessionMe } from "@/lib/types/portal";

export const INTERNAL_ADMIN_EMAIL = "operations@aetherpro.us";

export const isInternalAdmin = (me: Pick<SessionMe, "email"> | null | undefined): boolean => {
  if (!me?.email || typeof me.email !== "string") {
    return false;
  }
  return me.email.trim().toLowerCase() === INTERNAL_ADMIN_EMAIL;
};

