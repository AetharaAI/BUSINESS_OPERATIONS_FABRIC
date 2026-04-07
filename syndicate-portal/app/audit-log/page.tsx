"use client";

import { useCallback } from "react";
import { PortalNav } from "@/components/PortalNav";
import { AuditLogTable } from "@/components/AuditLogTable";
import { ErrorPanel, LoadingPanel } from "@/components/LoadStates";
import { portalApi } from "@/lib/client/api";
import { useApiResource } from "@/lib/client/use-api-resource";
import { canViewAuditLog } from "@/lib/client/authz";

export default function AuditLogPage() {
  const meLoader = useCallback(() => portalApi.me(), []);
  const meState = useApiResource(meLoader);
  const canAccess = canViewAuditLog(meState.data);
  const loader = useCallback(
    () => (canAccess ? portalApi.auditLog({ limit: 50 }) : Promise.resolve({ items: [], next_cursor: null })),
    [canAccess]
  );
  const { data, error, isLoading, reload } = useApiResource(loader);

  return (
    <>
      <PortalNav />
      <main className="content">
        <div className="container">
          {meState.isLoading ? <LoadingPanel label="Verifying access..." /> : null}
          {!meState.isLoading && !canAccess ? (
            <section className="panel alert alert-error">Forbidden. Audit log is internal admin only.</section>
          ) : null}
          {canAccess && isLoading ? <LoadingPanel label="Loading audit log..." /> : null}
          {canAccess && error ? <ErrorPanel message={error} onRetry={() => void reload()} /> : null}
          {canAccess && data ? <AuditLogTable items={data.items} /> : null}
        </div>
      </main>
    </>
  );
}
