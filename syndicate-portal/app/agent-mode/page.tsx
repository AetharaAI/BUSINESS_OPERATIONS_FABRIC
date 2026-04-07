"use client";

import { useCallback, useState } from "react";
import { PortalNav } from "@/components/PortalNav";
import { AgentModePanel } from "@/components/AgentModePanel";
import { ErrorPanel, LoadingPanel } from "@/components/LoadStates";
import { canEditAgentMode } from "@/lib/client/authz";
import { portalApi } from "@/lib/client/api";
import { useApiResource } from "@/lib/client/use-api-resource";
import { AgentMode } from "@/lib/types/portal";

export default function AgentModePage() {
  const modeLoader = useCallback(() => portalApi.agentMode(), []);
  const meLoader = useCallback(() => portalApi.me(), []);

  const modeState = useApiResource(modeLoader);
  const meState = useApiResource(meLoader);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const onSave = async (update: { mode: AgentMode; reason?: string }): Promise<void> => {
    setSaveError(null);
    setSaveSuccess(null);
    try {
      await portalApi.updateAgentMode(update);
      await modeState.reload();
      setSaveSuccess("Call settings request submitted.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Update failed");
      throw error;
    }
  };

  const loading = modeState.isLoading || meState.isLoading;
  const error = modeState.error || meState.error;

  return (
    <>
      <PortalNav />
      <main className="content">
        <div className="container stack">
          {loading ? <LoadingPanel label="Loading call settings..." /> : null}
          {error ? <ErrorPanel message={error} onRetry={() => void modeState.reload()} /> : null}
          {saveError ? <div className="alert alert-error">{saveError}</div> : null}
          {saveSuccess ? <div className="alert alert-warning">{saveSuccess}</div> : null}
          {modeState.data && meState.data ? (
            <AgentModePanel data={modeState.data} canEdit={canEditAgentMode(meState.data)} onSave={onSave} />
          ) : null}
        </div>
      </main>
    </>
  );
}
