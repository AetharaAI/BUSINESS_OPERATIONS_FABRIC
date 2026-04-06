"use client";

import { useCallback } from "react";
import { PortalNav } from "@/components/PortalNav";
import { AuditLogTable } from "@/components/AuditLogTable";
import { ErrorPanel, LoadingPanel } from "@/components/LoadStates";
import { portalApi } from "@/lib/client/api";
import { useApiResource } from "@/lib/client/use-api-resource";

export default function AuditLogPage() {
  const loader = useCallback(() => portalApi.auditLog({ limit: 50 }), []);
  const { data, error, isLoading, reload } = useApiResource(loader);

  return (
    <>
      <PortalNav />
      <main className="content">
        <div className="container">
          {isLoading ? <LoadingPanel label="Loading audit log..." /> : null}
          {error ? <ErrorPanel message={error} onRetry={() => void reload()} /> : null}
          {data ? <AuditLogTable items={data.items} /> : null}
        </div>
      </main>
    </>
  );
}
