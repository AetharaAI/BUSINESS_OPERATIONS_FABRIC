"use client";

import { useCallback } from "react";
import { PortalNav } from "@/components/PortalNav";
import { DashboardView } from "@/components/DashboardView";
import { ErrorPanel, LoadingPanel } from "@/components/LoadStates";
import { portalApi } from "@/lib/client/api";
import { useApiResource } from "@/lib/client/use-api-resource";

export default function DashboardPage() {
  const loader = useCallback(async () => {
    const dashboard = await portalApi.dashboard();
    let billing: Awaited<ReturnType<typeof portalApi.billingDocuments>> | null = null;
    try {
      billing = await portalApi.billingDocuments();
    } catch {
      billing = null;
    }
    return { dashboard, billing };
  }, []);
  const { data, error, isLoading, reload } = useApiResource(loader);

  return (
    <>
      <PortalNav />
      <main className="content">
        <div className="container">
          {isLoading ? <LoadingPanel label="Loading dashboard..." /> : null}
          {error ? <ErrorPanel message={error} onRetry={() => void reload()} /> : null}
          {data ? <DashboardView dashboard={data.dashboard} billing={data.billing} /> : null}
        </div>
      </main>
    </>
  );
}
