import { getCrmDb, crmSql } from "@/lib/server/db/client";
import { CrmRequestContext } from "@/lib/server/crm/request-context";

export type CrmTx = Parameters<Parameters<ReturnType<typeof getCrmDb>["transaction"]>[0]>[0];

export const withCrmContext = async <T>(
  context: CrmRequestContext,
  run: (tx: CrmTx) => Promise<T>
): Promise<T> =>
  getCrmDb().transaction(async (tx) => {
    await tx.execute(
      crmSql`
        select
          set_config('app.workspace_id', ${context.workspace_id}, true),
          set_config('app.tenant_id', ${context.tenant_id}, true)
      `
    );

    return run(tx as CrmTx);
  });
