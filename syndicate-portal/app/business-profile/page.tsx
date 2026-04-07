"use client";

import { useCallback } from "react";
import { PortalNav } from "@/components/PortalNav";
import { BusinessProfileView } from "@/components/BusinessProfileView";
import { ErrorPanel, LoadingPanel } from "@/components/LoadStates";
import { portalApi } from "@/lib/client/api";
import { useApiResource } from "@/lib/client/use-api-resource";

export default function BusinessProfilePage() {
  const loader = useCallback(async () => {
    const [profile, me] = await Promise.all([portalApi.businessProfile(), portalApi.me()]);
    return { profile, me };
  }, []);
  const { data, error, isLoading, reload } = useApiResource(loader);

  return (
    <>
      <PortalNav />
      <main className="content">
        <div className="container">
          {isLoading ? <LoadingPanel label="Loading business profile..." /> : null}
          {error ? <ErrorPanel message={error} onRetry={() => void reload()} /> : null}
          {data ? <BusinessProfileView profile={data.profile} fallbackPrimaryContactEmail={data.me.email ?? null} /> : null}
        </div>
      </main>
    </>
  );
}
