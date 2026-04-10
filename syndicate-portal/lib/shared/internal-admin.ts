import { SessionMe } from "@/lib/types/portal";

export const isInternalAdmin = (me: Pick<SessionMe, "is_platform_admin"> | null | undefined): boolean => {
  return me?.is_platform_admin === true;
};
