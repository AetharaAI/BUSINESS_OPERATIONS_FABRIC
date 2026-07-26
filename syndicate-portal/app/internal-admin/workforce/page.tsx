"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { PortalNav } from "@/components/PortalNav";
import { ErrorPanel, LoadingPanel } from "@/components/LoadStates";
import { portalApi } from "@/lib/client/api";
import { useApiResource } from "@/lib/client/use-api-resource";
import { isInternalAdmin } from "@/lib/client/authz";
import { WorkforceOnboardingBundle, WorkforceSuggestion } from "@/lib/types/workforce";

const RELATIONSHIP_OPTIONS = [
  "employee",
  "independent_contractor",
  "sales_representative",
  "advisor",
  "vendor"
] as const;

const ROLE_OPTIONS = ["internal_sales_rep", "internal_operator", "platform_admin"] as const;

export default function WorkforceAdminPage() {
  const meState = useApiResource(useCallback(() => portalApi.me(), []));
  const bundlesState = useApiResource(useCallback(() => portalApi.listWorkforceOnboarding(), []));

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<WorkforceSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [personId, setPersonId] = useState<string | undefined>(undefined);
  const [displayName, setDisplayName] = useState("");
  const [primaryEmail, setPrimaryEmail] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [relationshipType, setRelationshipType] = useState<(typeof RELATIONSHIP_OPTIONS)[number]>("independent_contractor");
  const [title, setTitle] = useState("Independent Sales Representative");
  const [roleKey, setRoleKey] = useState<(typeof ROLE_OPTIONS)[number]>("internal_sales_rep");
  const [agreementProvider, setAgreementProvider] = useState("pandadoc");
  const [agreementProviderRef, setAgreementProviderRef] = useState("");
  const [agreementType, setAgreementType] = useState("independent_sales_representative_commission");
  const [agreementStatus, setAgreementStatus] = useState<"draft" | "pending" | "completed" | "revoked">("completed");
  const [agreementCompletedAt, setAgreementCompletedAt] = useState("2026-07-16T05:52:08Z");
  const [complianceNotes, setComplianceNotes] = useState("W-8BEN requested for foreign independent contractor onboarding.");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canAccess = useMemo(() => isInternalAdmin(meState.data), [meState.data]);

  useEffect(() => {
    if (!canAccess || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const result = await portalApi.searchPeopleSuggestions(query.trim(), 8);
        setSuggestions(result);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [canAccess, query]);

  const applySuggestion = (suggestion: WorkforceSuggestion) => {
    setPersonId(suggestion.person_id ?? undefined);
    setDisplayName(suggestion.display_name);
    setPrimaryEmail(suggestion.primary_email);
    setQuery(suggestion.display_name);
    setSuggestions([]);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!meState.data?.workspace_id || !meState.data?.tenant_id) {
      setError("Missing workspace or tenant context for workforce onboarding.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      const bundle = await portalApi.upsertWorkforceOnboarding({
        workspace_id: meState.data.workspace_id,
        tenant_id: meState.data.tenant_id,
        person_id: personId,
        display_name: displayName.trim(),
        primary_email: primaryEmail.trim().toLowerCase(),
        primary_phone: primaryPhone.trim() || null,
        relationship_type: relationshipType,
        title: title.trim(),
        role_key: roleKey,
        agreement_provider: agreementProvider.trim(),
        agreement_provider_document_ref: agreementProviderRef.trim(),
        agreement_type: agreementType.trim(),
        agreement_status: agreementStatus,
        agreement_completed_at: agreementCompletedAt || null,
        document_storage_ref: null,
        certificate_storage_ref: null,
        agreement_sha256: null,
        compliance_document_type: "w8_ben",
        compliance_notes: complianceNotes.trim() || null,
        assigned_operator: meState.data.email ?? null
      });
      setPersonId(bundle.person.id);
      setInfo(`Saved workforce onboarding for ${bundle.person.display_name}.`);
      await bundlesState.reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save workforce onboarding");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendInvite = async (bundle: WorkforceOnboardingBundle) => {
    setError(null);
    setInfo(null);
    try {
      const response = await portalApi.sendWorkforceInvite(bundle.onboarding_case.id);
      setInfo(
        response.delivery_mode === "email"
          ? `Password reset email sent to ${response.invite_email}.`
          : response.invite_url
            ? `Invite ready for ${response.invite_email}: ${response.invite_url}`
            : `Invite recorded for ${response.invite_email}, but no direct link was returned.`
      );
      await bundlesState.reload();
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Failed to send workforce invite");
    }
  };

  const verifyRequirement = async (requirementId: string, verificationStatus: "verified" | "rejected") => {
    setError(null);
    setInfo(null);
    try {
      await portalApi.verifyWorkforceRequirement(requirementId, {
        verification_status: verificationStatus,
        notes: verificationStatus === "verified" ? "Operator verified uploaded document." : "Operator rejected uploaded document."
      });
      setInfo(`Requirement ${verificationStatus}.`);
      await bundlesState.reload();
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Failed to verify document requirement");
    }
  };

  return (
    <>
      <PortalNav />
      <main className="content">
        <div className="container stack">
          <section className="panel stack">
            <h1>Workforce Onboarding</h1>
            <p className="muted">
              Register or select a person, assign a workforce role, track agreement and W-8BEN status, and issue a scoped invite.
            </p>
          </section>

          {meState.isLoading ? <LoadingPanel label="Resolving workforce session..." /> : null}
          {meState.error ? <ErrorPanel message={meState.error} onRetry={() => void meState.reload()} /> : null}
          {!meState.isLoading && !meState.error && !canAccess ? (
            <section className="panel alert alert-error">Forbidden. This route is limited to internal operator sessions.</section>
          ) : null}

          {canAccess ? (
            <>
              <section className="panel stack">
                <h2>Create Or Update Workforce Member</h2>
                <form className="stack" onSubmit={submit}>
                  <div className="form-row">
                    <label className="label">Search existing person</label>
                    <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Type pr or sun..." />
                    {suggestionsLoading ? <div className="muted">Searching canonical people...</div> : null}
                    {suggestions.length > 0 ? (
                      <div className="stack" style={{ gap: "0.5rem" }}>
                        {suggestions.map((suggestion) => (
                          <button
                            key={`${suggestion.primary_email}:${suggestion.person_id ?? "new"}`}
                            className="btn btn-secondary"
                            type="button"
                            onClick={() => applySuggestion(suggestion)}
                            style={{ justifyContent: "flex-start" }}
                          >
                            {suggestion.display_name} · {suggestion.primary_email} · {suggestion.relationship_labels.join(", ") || suggestion.source}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="grid-2">
                    <div className="form-row">
                      <label className="label">Display name</label>
                      <input className="input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
                    </div>
                    <div className="form-row">
                      <label className="label">Primary email</label>
                      <input className="input" type="email" value={primaryEmail} onChange={(event) => setPrimaryEmail(event.target.value)} required />
                    </div>
                    <div className="form-row">
                      <label className="label">Primary phone</label>
                      <input className="input" value={primaryPhone} onChange={(event) => setPrimaryPhone(event.target.value)} />
                    </div>
                    <div className="form-row">
                      <label className="label">Relationship type</label>
                      <select className="select" value={relationshipType} onChange={(event) => setRelationshipType(event.target.value as (typeof RELATIONSHIP_OPTIONS)[number])}>
                        {RELATIONSHIP_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-row">
                      <label className="label">Title</label>
                      <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} required />
                    </div>
                    <div className="form-row">
                      <label className="label">Role grant</label>
                      <select className="select" value={roleKey} onChange={(event) => setRoleKey(event.target.value as (typeof ROLE_OPTIONS)[number])}>
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-row">
                      <label className="label">Agreement provider</label>
                      <input className="input" value={agreementProvider} onChange={(event) => setAgreementProvider(event.target.value)} required />
                    </div>
                    <div className="form-row">
                      <label className="label">Agreement reference</label>
                      <input className="input" value={agreementProviderRef} onChange={(event) => setAgreementProviderRef(event.target.value)} required />
                    </div>
                    <div className="form-row">
                      <label className="label">Agreement type</label>
                      <input className="input" value={agreementType} onChange={(event) => setAgreementType(event.target.value)} required />
                    </div>
                    <div className="form-row">
                      <label className="label">Agreement status</label>
                      <select className="select" value={agreementStatus} onChange={(event) => setAgreementStatus(event.target.value as "draft" | "pending" | "completed" | "revoked")}>
                        <option value="draft">draft</option>
                        <option value="pending">pending</option>
                        <option value="completed">completed</option>
                        <option value="revoked">revoked</option>
                      </select>
                    </div>
                    <div className="form-row">
                      <label className="label">Agreement completed at</label>
                      <input className="input" value={agreementCompletedAt} onChange={(event) => setAgreementCompletedAt(event.target.value)} />
                    </div>
                  </div>
                  <div className="form-row">
                    <label className="label">Compliance notes</label>
                    <textarea className="input" value={complianceNotes} onChange={(event) => setComplianceNotes(event.target.value)} rows={3} />
                  </div>
                  <button className="btn btn-primary" disabled={isSubmitting} type="submit">
                    {isSubmitting ? "Saving..." : "Save Workforce Onboarding"}
                  </button>
                </form>
              </section>

              {error ? <section className="panel alert alert-error">{error}</section> : null}
              {info ? <section className="panel alert alert-success">{info}</section> : null}

              <section className="panel stack">
                <h2>Current Workforce Cases</h2>
                {bundlesState.isLoading ? <LoadingPanel label="Loading workforce onboarding cases..." /> : null}
                {bundlesState.error ? <ErrorPanel message={bundlesState.error} onRetry={() => void bundlesState.reload()} /> : null}
                {bundlesState.data?.map((bundle) => (
                  <article key={bundle.person.id} className="panel stack" style={{ padding: "1rem", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="grid-2">
                      <div>
                        <h3 style={{ marginBottom: "0.35rem" }}>{bundle.person.display_name}</h3>
                        <p className="muted">{bundle.person.primary_email}</p>
                        <p className="muted">
                          {bundle.relationship.relationship_type} · {bundle.role_grant.role_key}
                        </p>
                      </div>
                      <div>
                        <p className="muted">Agreement: {bundle.agreement?.status ?? "missing"}</p>
                        <p className="muted">W-8BEN: {bundle.compliance_requirements[0]?.status ?? "missing"}</p>
                        <p className="muted">Onboarding: {bundle.onboarding_case.status}</p>
                        <p className="muted">Invite: {bundle.onboarding_case.invite_status}</p>
                      </div>
                    </div>
                    <div className="stack" style={{ gap: "0.5rem" }}>
                      <button className="btn btn-secondary" type="button" onClick={() => void sendInvite(bundle)}>
                        Send Invite
                      </button>
                      {bundle.compliance_requirements.map((requirement) => (
                        <div key={requirement.id} className="grid-2">
                          <div className="muted">
                            {requirement.document_type} · {requirement.status} · verification {requirement.verification_status}
                          </div>
                          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                            <button className="btn btn-secondary" type="button" onClick={() => void verifyRequirement(requirement.id, "verified")}>
                              Verify
                            </button>
                            <button className="btn btn-secondary" type="button" onClick={() => void verifyRequirement(requirement.id, "rejected")}>
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </section>
            </>
          ) : null}
        </div>
      </main>
    </>
  );
}
