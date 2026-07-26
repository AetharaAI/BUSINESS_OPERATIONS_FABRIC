import { z } from "zod";
import { SessionMe } from "@/lib/types/portal";

export const CrmRequestContextSchema = z.object({
  workspace_id: z.string().uuid(),
  tenant_id: z.string().uuid()
});

export type CrmRequestContext = z.infer<typeof CrmRequestContextSchema>;

export const resolveCrmRequestContext = (
  raw: unknown,
  session: SessionMe
): CrmRequestContext => {
  const parsed = CrmRequestContextSchema.parse(raw);

  if (session.workforce_role === "customer" && session.tenant_id && parsed.tenant_id !== session.tenant_id) {
    throw new Error("Forbidden");
  }

  return parsed;
};
