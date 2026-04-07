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
  const [bypassDestination, setBypassDestination] = useState(data.fallback_destination ?? "");
  const [emergencyInstructions, setEmergencyInstructions] = useState("");
  const [primaryGreeting, setPrimaryGreeting] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [promoMessage, setPromoMessage] = useState("");
  const [pronunciationNotes, setPronunciationNotes] = useState("");
  const [callNeeds, setCallNeeds] = useState("");
  const [requiredInfo, setRequiredInfo] = useState("");
  const [urgencyNotes, setUrgencyNotes] = useState("");
  const [afterHoursInstructions, setAfterHoursInstructions] = useState("");
  const [allowAppointments, setAllowAppointments] = useState(true);
  const [allowEscalation, setAllowEscalation] = useState(true);
  const [urgentCallHandling, setUrgentCallHandling] = useState("");
  const [requestedChangeSummary, setRequestedChangeSummary] = useState("");
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
      const composedSummary =
        requestedChangeSummary.trim() ||
        [
          primaryGreeting.trim() && `Greeting: ${primaryGreeting.trim()}`,
          businessDescription.trim() && `Business: ${businessDescription.trim()}`,
          promoMessage.trim() && `Promo: ${promoMessage.trim()}`,
          pronunciationNotes.trim() && `Pronunciation: ${pronunciationNotes.trim()}`,
          callNeeds.trim() && `Call needs: ${callNeeds.trim()}`,
          requiredInfo.trim() && `Required info: ${requiredInfo.trim()}`,
          urgencyNotes.trim() && `Urgency notes: ${urgencyNotes.trim()}`,
          afterHoursInstructions.trim() && `After-hours: ${afterHoursInstructions.trim()}`,
          bypassDestination.trim() && `Bypass destination: ${bypassDestination.trim()}`,
          emergencyInstructions.trim() && `Emergency fallback: ${emergencyInstructions.trim()}`,
          !allowAppointments && "Appointments: not allowed",
          !allowEscalation && "Escalation/transfer: not allowed",
          urgentCallHandling.trim() && `Urgent handling: ${urgentCallHandling.trim()}`
        ]
          .filter(Boolean)
          .join(" | ");

      const reason = composedSummary.trim().slice(0, 300);
      await onSave({ mode, reason: reason || undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update mode");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="panel stack">
      <h1>Call Settings</h1>
      <p className="muted">Configure how your business wants calls handled. Some updates may be reviewed before going live.</p>
      {!data.effective_in_live_routing ? (
        <div className="alert alert-warning">
          Routing enforcement pending. Updates are audit-backed but not yet effective in live routing.
        </div>
      ) : null}

      <div className="panel stack">
        <h2>Service Controls</h2>
        <div className="form-row">
          <label htmlFor="mode" className="label">
            Call handling mode
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
          <label htmlFor="bypass-destination" className="label">
            Bypass or fallback destination
          </label>
          <input
            id="bypass-destination"
            className="input"
            value={bypassDestination}
            onChange={(event) => setBypassDestination(event.target.value)}
            disabled={!canEdit}
            placeholder="Main line, voicemail, or alternate number"
          />
        </div>
        <div className="form-row">
          <label htmlFor="emergency-instructions" className="label">
            Emergency fallback instructions
          </label>
          <textarea
            id="emergency-instructions"
            className="textarea"
            rows={2}
            value={emergencyInstructions}
            onChange={(event) => setEmergencyInstructions(event.target.value)}
            disabled={!canEdit}
          />
        </div>
      </div>

      <div className="panel stack">
        <h2>Greeting & Messaging</h2>
        <div className="form-row">
          <label htmlFor="primary-greeting" className="label">
            Primary greeting
          </label>
          <textarea
            id="primary-greeting"
            className="textarea"
            rows={2}
            value={primaryGreeting}
            onChange={(event) => setPrimaryGreeting(event.target.value)}
            disabled={!canEdit}
          />
        </div>
        <div className="form-row">
          <label htmlFor="business-description" className="label">
            Business or service description
          </label>
          <textarea
            id="business-description"
            className="textarea"
            rows={2}
            value={businessDescription}
            onChange={(event) => setBusinessDescription(event.target.value)}
            disabled={!canEdit}
          />
        </div>
        <div className="form-row">
          <label htmlFor="promo-message" className="label">
            Promo or seasonal announcement
          </label>
          <textarea
            id="promo-message"
            className="textarea"
            rows={2}
            value={promoMessage}
            onChange={(event) => setPromoMessage(event.target.value)}
            disabled={!canEdit}
          />
        </div>
        <div className="form-row">
          <label htmlFor="pronunciation-notes" className="label">
            Pronunciation or wording notes
          </label>
          <textarea
            id="pronunciation-notes"
            className="textarea"
            rows={2}
            value={pronunciationNotes}
            onChange={(event) => setPronunciationNotes(event.target.value)}
            disabled={!canEdit}
          />
        </div>
      </div>

      <div className="panel stack">
        <h2>Intake Preferences</h2>
        <div className="form-row">
          <label htmlFor="call-needs" className="label">
            What callers usually need
          </label>
          <textarea
            id="call-needs"
            className="textarea"
            rows={2}
            value={callNeeds}
            onChange={(event) => setCallNeeds(event.target.value)}
            disabled={!canEdit}
          />
        </div>
        <div className="form-row">
          <label htmlFor="required-info" className="label">
            Required information to collect
          </label>
          <textarea
            id="required-info"
            className="textarea"
            rows={2}
            value={requiredInfo}
            onChange={(event) => setRequiredInfo(event.target.value)}
            disabled={!canEdit}
          />
        </div>
        <div className="form-row">
          <label htmlFor="urgency-notes" className="label">
            Urgency and escalation notes
          </label>
          <textarea
            id="urgency-notes"
            className="textarea"
            rows={2}
            value={urgencyNotes}
            onChange={(event) => setUrgencyNotes(event.target.value)}
            disabled={!canEdit}
          />
        </div>
        <div className="form-row">
          <label htmlFor="after-hours-instructions" className="label">
            After-hours handling instructions
          </label>
          <textarea
            id="after-hours-instructions"
            className="textarea"
            rows={2}
            value={afterHoursInstructions}
            onChange={(event) => setAfterHoursInstructions(event.target.value)}
            disabled={!canEdit}
          />
        </div>
      </div>

      <div className="panel stack">
        <h2>Escalation & Scheduling</h2>
        <div className="grid-2">
          <div className="form-row">
            <label htmlFor="allow-appointments" className="label">
              Allow appointment requests
            </label>
            <select
              id="allow-appointments"
              className="select"
              value={allowAppointments ? "yes" : "no"}
              onChange={(event) => setAllowAppointments(event.target.value === "yes")}
              disabled={!canEdit}
            >
              <option value="yes">yes</option>
              <option value="no">no</option>
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="allow-escalation" className="label">
              Allow escalation or transfer
            </label>
            <select
              id="allow-escalation"
              className="select"
              value={allowEscalation ? "yes" : "no"}
              onChange={(event) => setAllowEscalation(event.target.value === "yes")}
              disabled={!canEdit}
            >
              <option value="yes">yes</option>
              <option value="no">no</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <label htmlFor="urgent-call-handling" className="label">
            Urgent call handling preference
          </label>
          <textarea
            id="urgent-call-handling"
            className="textarea"
            rows={2}
            value={urgentCallHandling}
            onChange={(event) => setUrgentCallHandling(event.target.value)}
            disabled={!canEdit}
          />
        </div>
      </div>

      <div className="panel stack">
        <h2>Review & Submit</h2>
        <div className="form-row">
          <label htmlFor="requested-change-summary" className="label">
            Requested change summary (optional)
          </label>
          <textarea
            id="requested-change-summary"
            className="textarea"
            rows={3}
            value={requestedChangeSummary}
            onChange={(event) => setRequestedChangeSummary(event.target.value)}
            disabled={!canEdit}
            maxLength={300}
          />
        </div>
        <p className="muted">
          Changes may be reviewed before being applied to live call handling. Service mode updates are tracked immediately.
        </p>
      </div>

      <div className="muted">Last changed: {data.changed_at ?? "Unknown"} by {data.changed_by ?? "Unknown"}</div>
      {error ? <div className="alert alert-error">{error}</div> : null}

      {canEdit ? (
        <div>
          <button className="btn btn-primary" type="button" onClick={() => void submit()} disabled={isSaving}>
            {isSaving ? "Submitting..." : "Submit Call Settings Request"}
          </button>
        </div>
      ) : (
        <p className="muted">Your role is read-only for call settings requests.</p>
      )}
    </section>
  );
};
