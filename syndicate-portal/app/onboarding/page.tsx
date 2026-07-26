"use client";

import { ChangeEvent, useCallback, useMemo, useState } from "react";
import { PortalNav } from "@/components/PortalNav";
import { ErrorPanel, LoadingPanel } from "@/components/LoadStates";
import { portalApi } from "@/lib/client/api";
import { useApiResource } from "@/lib/client/use-api-resource";

const W8_BEN_FORM_URL = "https://www.irs.gov/pub/irs-pdf/fw8ben.pdf";

export default function WorkforceOnboardingPage() {
  const meState = useApiResource(useCallback(() => portalApi.me(), []));
  const bundleState = useApiResource(useCallback(() => portalApi.myWorkforceOnboarding(), []));
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const canAccess = useMemo(
    () => Boolean(meState.data?.workforce_role && meState.data.workforce_role !== "customer"),
    [meState.data]
  );

  const onFileChange = (requirementId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFiles((current) => ({ ...current, [requirementId]: file }));
  };

  const upload = async (requirementId: string) => {
    const file = selectedFiles[requirementId];
    if (!file) {
      setError("Choose a document before uploading.");
      return;
    }

    setUploadingId(requirementId);
    setInfo(null);
    setError(null);
    try {
      await portalApi.uploadOwnWorkforceDocument(requirementId, file);
      setInfo("Document uploaded for review.");
      setSelectedFiles((current) => ({ ...current, [requirementId]: null }));
      await bundleState.reload();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload document");
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <>
      <PortalNav />
      <main className="content">
        <div className="container stack">
          <section className="panel stack">
            <h1>My Workforce Onboarding</h1>
            <p className="muted">Confirm your onboarding status, review your approved role, and submit required compliance documents.</p>
          </section>

          {meState.isLoading || bundleState.isLoading ? <LoadingPanel label="Loading onboarding state..." /> : null}
          {meState.error ? <ErrorPanel message={meState.error} onRetry={() => void meState.reload()} /> : null}
          {bundleState.error ? <ErrorPanel message={bundleState.error} onRetry={() => void bundleState.reload()} /> : null}
          {!meState.isLoading && !meState.error && !canAccess ? (
            <section className="panel alert alert-error">Forbidden. This route is limited to signed-in workforce members.</section>
          ) : null}

          {error ? <section className="panel alert alert-error">{error}</section> : null}
          {info ? <section className="panel alert alert-success">{info}</section> : null}

          {canAccess && bundleState.data ? (
            <>
              <section className="panel stack">
                <h2>{bundleState.data.person.display_name}</h2>
                <div className="grid-2">
                  <div>
                    <p className="muted">{bundleState.data.person.primary_email}</p>
                    <p className="muted">{bundleState.data.relationship.title}</p>
                    <p className="muted">Role: {bundleState.data.role_grant.role_key}</p>
                  </div>
                  <div>
                    <p className="muted">Onboarding status: {bundleState.data.onboarding_case.status}</p>
                    <p className="muted">Invite status: {bundleState.data.onboarding_case.invite_status}</p>
                    <p className="muted">Agreement status: {bundleState.data.agreement?.status ?? "pending"}</p>
                  </div>
                </div>
                <div className="stack" style={{ gap: "0.5rem" }}>
                  <div className="muted">Permitted activities</div>
                  <div className="muted">{bundleState.data.role_grant.capability_scope.join(", ")}</div>
                </div>
              </section>

              <section className="panel stack">
                <h2>Agreement + Compliance</h2>
                <p className="muted">
                  Agreement reference: {bundleState.data.agreement?.provider_document_ref ?? "Not linked yet"} · provider {bundleState.data.agreement?.provider ?? "pending"}
                </p>
                <a className="btn btn-secondary" href={W8_BEN_FORM_URL} target="_blank" rel="noreferrer">
                  Open Official W-8BEN Form
                </a>
                {bundleState.data.compliance_requirements.map((requirement) => (
                  <article key={requirement.id} className="panel stack" style={{ padding: "1rem", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div>
                      <h3 style={{ marginBottom: "0.35rem" }}>{requirement.document_type}</h3>
                      <p className="muted">
                        Status: {requirement.status} · Verification: {requirement.verification_status}
                      </p>
                      {requirement.notes ? <p className="muted">{requirement.notes}</p> : null}
                    </div>
                    <div className="stack" style={{ gap: "0.5rem" }}>
                      <input className="input" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(event) => onFileChange(requirement.id, event)} />
                      <button
                        className="btn btn-primary"
                        disabled={uploadingId === requirement.id}
                        type="button"
                        onClick={() => void upload(requirement.id)}
                      >
                        {uploadingId === requirement.id ? "Uploading..." : "Upload Document"}
                      </button>
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
