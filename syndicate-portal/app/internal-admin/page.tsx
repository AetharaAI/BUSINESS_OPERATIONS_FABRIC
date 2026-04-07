"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import { PortalNav } from "@/components/PortalNav";
import { ErrorPanel, LoadingPanel } from "@/components/LoadStates";
import { portalApi } from "@/lib/client/api";
import { useApiResource } from "@/lib/client/use-api-resource";
import { Plan, TenantBillingState } from "@/lib/types/portal";

const copyToClipboard = async (value: string): Promise<void> => {
  await navigator.clipboard.writeText(value);
};

export default function InternalAdminPage() {
  const meState = useApiResource(useCallback(() => portalApi.me(), []));
  const statesResource = useApiResource(useCallback(() => portalApi.listOnboardingStates(), []));

  const [tenantName, setTenantName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [createPlan, setCreatePlan] = useState<Plan>("starter");
  const [createAgreementStatus, setCreateAgreementStatus] = useState<TenantBillingState["agreement_status"]>("draft");
  const [createDepositStatus, setCreateDepositStatus] = useState<TenantBillingState["deposit_status"]>("pending");
  const [createFinalSetupStatus, setCreateFinalSetupStatus] = useState<TenantBillingState["final_setup_status"]>("pending");
  const [createMonthlyStatus, setCreateMonthlyStatus] = useState<TenantBillingState["monthly_status"]>("inactive");
  const [createInviteStatus, setCreateInviteStatus] = useState<TenantBillingState["portal_invite_status"]>("not_sent");
  const [createDocuSignEnvelopeId, setCreateDocuSignEnvelopeId] = useState("");
  const [createOnboardingNotes, setCreateOnboardingNotes] = useState("");
  const [existingTenantId, setExistingTenantId] = useState("");
  const [existingTenantName, setExistingTenantName] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [bootstrapResult, setBootstrapResult] = useState<null | {
    tenant_id: string;
    owner_email: string;
    temporary_password?: string | null;
    password_reset_token?: string | null;
    invite_url?: string | null;
  }>(null);

  const canAccess = useMemo(() => {
    if (!meState.data?.role) return false;
    const role = meState.data.role.toLowerCase();
    return role === "admin" || role === "platform_admin" || role === "owner";
  }, [meState.data?.role]);

  const selectedState: TenantBillingState | null = useMemo(() => {
    if (!statesResource.data?.length) return null;
    const id = selectedTenantId || statesResource.data[0].tenant_id;
    return statesResource.data.find((item) => item.tenant_id === id) ?? null;
  }, [statesResource.data, selectedTenantId]);

  const bootstrapTenant = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError(null);
    setInfo(null);
    setBootstrapResult(null);
    setIsSubmitting(true);
    try {
      const payload = await portalApi.adminBootstrapTenant({
        tenant_name: tenantName.trim(),
        owner_email: ownerEmail.trim().toLowerCase(),
        owner_full_name: ownerName.trim(),
        selected_plan: createPlan,
        agreement_status: createAgreementStatus,
        deposit_status: createDepositStatus,
        final_setup_status: createFinalSetupStatus,
        monthly_status: createMonthlyStatus,
        portal_invite_status: createInviteStatus,
        docusign_envelope_id: createDocuSignEnvelopeId.trim() || null,
        onboarding_notes: createOnboardingNotes.trim() || null
      });
      setBootstrapResult(payload);
      setSelectedTenantId(payload.tenant_id);
      await statesResource.reload();
      setInfo("Tenant, owner, and onboarding/billing state created in one step.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to bootstrap tenant");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addExistingTenant = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError(null);
    setInfo(null);
    setIsSubmitting(true);
    try {
      const state = await portalApi.ensureOnboardingState({
        tenant_id: existingTenantId.trim(),
        tenant_name: existingTenantName.trim() || undefined,
        selected_plan: "starter"
      });
      setSelectedTenantId(state.tenant_id);
      await statesResource.reload();
      setInfo("Existing tenant added to onboarding/billing tracking.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add existing tenant");
    } finally {
      setIsSubmitting(false);
    }
  };

  const patchState = async (patch: Partial<TenantBillingState>): Promise<void> => {
    if (!selectedState) return;
    setFormError(null);
    setInfo(null);
    setIsSubmitting(true);
    try {
      await portalApi.updateOnboardingState({
        tenant_id: selectedState.tenant_id,
        ...patch
      });
      await statesResource.reload();
      setInfo("Onboarding state updated.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to update onboarding state");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PortalNav />
      <main className="content">
        <div className="container stack">
          <section className="panel stack">
            <h1>Internal Admin Onboarding + Billing</h1>
            <p className="muted">
              Close flow: create/select tenant, set plan, track agreement/payment statuses, copy Stripe payment links, and track invite status.
            </p>
          </section>

          {meState.isLoading ? <LoadingPanel label="Verifying admin session..." /> : null}
          {meState.error ? <ErrorPanel message={meState.error} onRetry={() => void meState.reload()} /> : null}
          {!meState.isLoading && !meState.error && !canAccess ? (
            <section className="panel alert alert-error">Forbidden. This route is internal admin only.</section>
          ) : null}

          {canAccess ? (
            <>
              <section className="panel stack">
                <h2>Create Tenant + Owner</h2>
                <form className="stack" onSubmit={bootstrapTenant}>
                  <div className="form-row">
                    <label className="label">Tenant name</label>
                    <input className="input" value={tenantName} onChange={(e) => setTenantName(e.target.value)} required />
                  </div>
                  <div className="form-row">
                    <label className="label">Owner full name</label>
                    <input className="input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
                  </div>
                  <div className="form-row">
                    <label className="label">Owner email</label>
                    <input
                      className="input"
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid-2">
                    <div className="form-row">
                      <label className="label">Plan</label>
                      <select className="select" value={createPlan} onChange={(e) => setCreatePlan(e.target.value as Plan)}>
                        <option value="starter">starter</option>
                        <option value="growth">growth</option>
                        <option value="operator">operator</option>
                      </select>
                    </div>
                    <div className="form-row">
                      <label className="label">Agreement status</label>
                      <select
                        className="select"
                        value={createAgreementStatus}
                        onChange={(e) => setCreateAgreementStatus(e.target.value as TenantBillingState["agreement_status"])}
                      >
                        <option value="draft">draft</option>
                        <option value="sent">sent</option>
                        <option value="signed">signed</option>
                      </select>
                    </div>
                    <div className="form-row">
                      <label className="label">Deposit status</label>
                      <select
                        className="select"
                        value={createDepositStatus}
                        onChange={(e) => setCreateDepositStatus(e.target.value as TenantBillingState["deposit_status"])}
                      >
                        <option value="pending">pending</option>
                        <option value="paid">paid</option>
                      </select>
                    </div>
                    <div className="form-row">
                      <label className="label">Final setup status</label>
                      <select
                        className="select"
                        value={createFinalSetupStatus}
                        onChange={(e) => setCreateFinalSetupStatus(e.target.value as TenantBillingState["final_setup_status"])}
                      >
                        <option value="pending">pending</option>
                        <option value="paid">paid</option>
                        <option value="not_required">not_required</option>
                      </select>
                    </div>
                    <div className="form-row">
                      <label className="label">Monthly status</label>
                      <select
                        className="select"
                        value={createMonthlyStatus}
                        onChange={(e) => setCreateMonthlyStatus(e.target.value as TenantBillingState["monthly_status"])}
                      >
                        <option value="inactive">inactive</option>
                        <option value="pending">pending</option>
                        <option value="active">active</option>
                      </select>
                    </div>
                    <div className="form-row">
                      <label className="label">Portal invite status</label>
                      <select
                        className="select"
                        value={createInviteStatus}
                        onChange={(e) => setCreateInviteStatus(e.target.value as TenantBillingState["portal_invite_status"])}
                      >
                        <option value="not_sent">not_sent</option>
                        <option value="sent">sent</option>
                        <option value="accepted">accepted</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <label className="label">DocuSign envelope ID (optional)</label>
                    <input
                      className="input"
                      value={createDocuSignEnvelopeId}
                      onChange={(e) => setCreateDocuSignEnvelopeId(e.target.value)}
                    />
                  </div>
                  <div className="form-row">
                    <label className="label">Onboarding notes (optional)</label>
                    <textarea
                      className="textarea"
                      rows={3}
                      value={createOnboardingNotes}
                      onChange={(e) => setCreateOnboardingNotes(e.target.value)}
                    />
                  </div>
                  <div>
                    <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Creating..." : "Create Tenant + Invite"}
                    </button>
                  </div>
                </form>
                {bootstrapResult ? (
                  <div className="alert alert-warning stack">
                    <div>
                      <strong>Tenant ID:</strong> {bootstrapResult.tenant_id}
                    </div>
                    <div>
                      <strong>Owner:</strong> {bootstrapResult.owner_email}
                    </div>
                    <div>
                      <strong>Temp password:</strong> {bootstrapResult.temporary_password || "n/a"}
                    </div>
                    <div>
                      <strong>Password reset token:</strong> {bootstrapResult.password_reset_token || "n/a"}
                    </div>
                    <div>
                      <strong>Activation URL:</strong>{" "}
                      {bootstrapResult.invite_url ? (
                        <a href={bootstrapResult.invite_url} target="_blank" rel="noreferrer">
                          {bootstrapResult.invite_url}
                        </a>
                      ) : (
                        "n/a"
                      )}
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="panel stack">
                <h2>Add Existing Tenant to Tracking</h2>
                <form className="stack" onSubmit={addExistingTenant}>
                  <div className="form-row">
                    <label className="label">Existing tenant ID</label>
                    <input
                      className="input"
                      value={existingTenantId}
                      onChange={(e) => setExistingTenantId(e.target.value)}
                      placeholder="tenant_..."
                      required
                    />
                  </div>
                  <div className="form-row">
                    <label className="label">Tenant name (optional)</label>
                    <input className="input" value={existingTenantName} onChange={(e) => setExistingTenantName(e.target.value)} />
                  </div>
                  <div>
                    <button className="btn btn-secondary" type="submit" disabled={isSubmitting}>
                      Track Existing Tenant
                    </button>
                  </div>
                </form>
              </section>

              <section className="panel stack">
                <h2>Onboarding State</h2>
                {statesResource.isLoading ? <p className="muted">Loading tenant states...</p> : null}
                {statesResource.error ? <ErrorPanel message={statesResource.error} onRetry={() => void statesResource.reload()} /> : null}
                {statesResource.data?.length ? (
                  <>
                    <div className="form-row">
                      <label className="label">Tenant</label>
                      <select
                        className="select"
                        value={selectedState?.tenant_id ?? ""}
                        onChange={(e) => setSelectedTenantId(e.target.value)}
                      >
                        {statesResource.data.map((item) => (
                          <option key={item.tenant_id} value={item.tenant_id}>
                            {item.tenant_name || item.tenant_id}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedState ? (
                      <div className="stack">
                        <div className="grid-2">
                          <div className="form-row">
                            <label className="label">Plan</label>
                            <select
                              className="select"
                              value={selectedState.selected_plan}
                              onChange={(e) => void patchState({ selected_plan: e.target.value as Plan })}
                            >
                              <option value="starter">starter</option>
                              <option value="growth">growth</option>
                              <option value="operator">operator</option>
                            </select>
                          </div>
                          <div className="form-row">
                            <label className="label">Agreement status</label>
                            <select
                              className="select"
                              value={selectedState.agreement_status}
                              onChange={(e) => void patchState({ agreement_status: e.target.value as TenantBillingState["agreement_status"] })}
                            >
                              <option value="draft">draft</option>
                              <option value="sent">sent</option>
                              <option value="signed">signed</option>
                            </select>
                          </div>
                          <div className="form-row">
                            <label className="label">Deposit status</label>
                            <select
                              className="select"
                              value={selectedState.deposit_status}
                              onChange={(e) => void patchState({ deposit_status: e.target.value as TenantBillingState["deposit_status"] })}
                            >
                              <option value="pending">pending</option>
                              <option value="paid">paid</option>
                            </select>
                          </div>
                          <div className="form-row">
                            <label className="label">Final setup status</label>
                            <select
                              className="select"
                              value={selectedState.final_setup_status}
                              onChange={(e) =>
                                void patchState({ final_setup_status: e.target.value as TenantBillingState["final_setup_status"] })
                              }
                            >
                              <option value="pending">pending</option>
                              <option value="paid">paid</option>
                              <option value="not_required">not_required</option>
                            </select>
                          </div>
                          <div className="form-row">
                            <label className="label">Monthly status</label>
                            <select
                              className="select"
                              value={selectedState.monthly_status}
                              onChange={(e) => void patchState({ monthly_status: e.target.value as TenantBillingState["monthly_status"] })}
                            >
                              <option value="inactive">inactive</option>
                              <option value="pending">pending</option>
                              <option value="active">active</option>
                            </select>
                          </div>
                          <div className="form-row">
                            <label className="label">Portal invite status</label>
                            <select
                              className="select"
                              value={selectedState.portal_invite_status}
                              onChange={(e) =>
                                void patchState({ portal_invite_status: e.target.value as TenantBillingState["portal_invite_status"] })
                              }
                            >
                              <option value="not_sent">not_sent</option>
                              <option value="sent">sent</option>
                              <option value="accepted">accepted</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid-2">
                          <div className="form-row">
                            <label className="label">DocuSign envelope ID</label>
                            <input
                              className="input"
                              defaultValue={selectedState.docusign_envelope_id ?? ""}
                              onBlur={(e) => void patchState({ docusign_envelope_id: e.target.value || null })}
                            />
                          </div>
                          <div className="form-row">
                            <label className="label">Stripe customer ID</label>
                            <input
                              className="input"
                              defaultValue={selectedState.stripe_customer_id ?? ""}
                              onBlur={(e) => void patchState({ stripe_customer_id: e.target.value || null })}
                            />
                          </div>
                        </div>

                        <div className="form-row">
                          <label className="label">Onboarding notes</label>
                          <textarea
                            className="textarea"
                            rows={4}
                            defaultValue={selectedState.onboarding_notes ?? ""}
                            onBlur={(e) => void patchState({ onboarding_notes: e.target.value || null })}
                          />
                        </div>

                        <section className="panel stack">
                          <h3>Stripe Mapping (readonly)</h3>
                          <div className="grid-2">
                            <div>
                              <div className="label">stripe_product_id_reference</div>
                              <code>{selectedState.stripe_product_id_reference || "n/a"}</code>
                            </div>
                            <div>
                              <div className="label">stripe_price_id_deposit</div>
                              <code>{selectedState.stripe_price_id_deposit || "n/a"}</code>
                            </div>
                            <div>
                              <div className="label">stripe_price_id_final_setup</div>
                              <code>{selectedState.stripe_price_id_final_setup || "n/a"}</code>
                            </div>
                            <div>
                              <div className="label">stripe_price_id_monthly</div>
                              <code>{selectedState.stripe_price_id_monthly || "n/a"}</code>
                            </div>
                          </div>

                          <div className="grid-2">
                            <div className="stack">
                              <div className="label">Deposit payment link</div>
                              <code>{selectedState.payment_link_deposit || "n/a"}</code>
                              {selectedState.payment_link_deposit ? (
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => void copyToClipboard(selectedState.payment_link_deposit!)}
                                >
                                  Copy Deposit Link
                                </button>
                              ) : null}
                            </div>
                            <div className="stack">
                              <div className="label">Final setup payment link</div>
                              <code>{selectedState.payment_link_final_setup || "n/a"}</code>
                              {selectedState.payment_link_final_setup ? (
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => void copyToClipboard(selectedState.payment_link_final_setup!)}
                                >
                                  Copy Final Setup Link
                                </button>
                              ) : null}
                            </div>
                          </div>

                          <div>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => void patchState({ portal_invite_status: "sent" })}
                            >
                              Mark Invite Sent (Scaffold)
                            </button>
                          </div>
                        </section>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="muted">No onboarding states yet. Create or add a tenant above.</p>
                )}
              </section>
            </>
          ) : null}

          {formError ? <div className="panel alert alert-error">{formError}</div> : null}
          {info ? <div className="panel alert alert-warning">{info}</div> : null}
        </div>
      </main>
    </>
  );
}
