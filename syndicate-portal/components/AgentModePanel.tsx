"use client";

import { useState } from "react";
import { AgentMode, PortalAgentModeResponse } from "@/lib/types/portal";

const MODES: AgentMode[] = ["enabled", "bypass", "after_hours_only"];

export const AgentModePanel = ({
  data,
  canEdit,
  onSave
}: {
  data: PortalAgentModeResponse;
  canEdit: boolean;
  onSave: (update: { mode: AgentMode; reason?: string }) => Promise<void>;
}) => {
  const [mode, setMode] = useState<AgentMode>(data.mode);
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedModeSupported = MODES.includes(mode);

  const submit = async (): Promise<void> => {
    if (!selectedModeSupported) {
      setError("Unsupported mode value returned by API.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave({ mode, reason: reason.trim() || undefined });
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update mode");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="panel stack">
      <h1>Agent Mode</h1>
      {!data.effective_in_live_routing ? (
        <div className="alert alert-warning">
          Routing enforcement pending. Updates are audit-backed but not yet effective in live routing.
        </div>
      ) : null}

      <div className="form-row">
        <label htmlFor="mode" className="label">
          Mode
        </label>
        <select
          id="mode"
          className="select"
          value={mode}
          onChange={(event) => setMode(event.target.value as AgentMode)}
          disabled={!canEdit}
        >
          {MODES.map((modeOption) => (
            <option key={modeOption} value={modeOption}>
              {modeOption}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <label htmlFor="reason" className="label">
          Change reason (optional)
        </label>
        <textarea
          id="reason"
          className="textarea"
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={!canEdit}
          maxLength={300}
        />
      </div>

      <div className="muted">Last changed: {data.changed_at ?? "Unknown"} by {data.changed_by ?? "Unknown"}</div>
      {error ? <div className="alert alert-error">{error}</div> : null}

      {canEdit ? (
        <div>
          <button className="btn btn-primary" type="button" onClick={() => void submit()} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save mode"}
          </button>
        </div>
      ) : (
        <p className="muted">Your role is read-only for mode changes.</p>
      )}
    </section>
  );
};
