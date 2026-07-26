"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { portalApi } from "@/lib/client/api";
import { useApiResource } from "@/lib/client/use-api-resource";
import type { TenantBillingState } from "@/lib/types/portal";
import type {
  WebsiteOfferCatalog,
  WebsiteProvisioningStep,
  WebsiteProvisioningSummary,
  WebsiteProvisioningTaskStatus
} from "@/lib/types/website-provisioning";

type WebsiteProvisioningPanelProps = {
  selectedState: TenantBillingState;
  canManageOperations: boolean;
};

const formatUsd = (valueCents: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(valueCents / 100);

const capabilityListToText = (values: string[]): string => values.join(", ");

const capabilityTextToList = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const buildTenantAwareCheckoutUrl = (params: {
  baseUrl: string | null | undefined;
  tenantId: string;
  customerEmail?: string | null;
}): string | null => {
  if (!params.baseUrl) {
    return null;
  }

  try {
    const url = new URL(params.baseUrl);
    url.searchParams.set("client_reference_id", params.tenantId);
    if (params.customerEmail) {
      url.searchParams.set("prefilled_email", params.customerEmail);
    }
    return url.toString();
  } catch {
    return params.baseUrl;
  }
};

export function WebsiteProvisioningPanel({
  selectedState,
  canManageOperations
}: WebsiteProvisioningPanelProps) {
  const tenantId = selectedState.tenant_id;
  const resource = useApiResource(
    useCallback(
      () =>
        tenantId
          ? portalApi.getWebsiteProvisioning(tenantId)
          : Promise.resolve<{ item: WebsiteProvisioningSummary | null; catalog: WebsiteOfferCatalog } | null>(null),
      [tenantId]
    )
  );

  const [businessName, setBusinessName] = useState(selectedState.tenant_name ?? "");
  const [primaryContactName, setPrimaryContactName] = useState("");
  const [primaryContactEmail, setPrimaryContactEmail] = useState("");
  const [primaryContactPhone, setPrimaryContactPhone] = useState("");
  const [triggerKind, setTriggerKind] = useState<"confirmed_close" | "payment_confirmed">("confirmed_close");
  const [websiteDomain, setWebsiteDomain] = useState("");
  const [websiteObjective, setWebsiteObjective] = useState("");
  const [promisedCapabilities, setPromisedCapabilities] = useState("");
  const [timelineDiscussed, setTimelineDiscussed] = useState("");
  const [escalationsOrCaveats, setEscalationsOrCaveats] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [nextCustomerAction, setNextCustomerAction] = useState("");
  const [nextAetherproAction, setNextAetherproAction] = useState("");
  const [accountableOwner, setAccountableOwner] = useState("");
  const [statusTaskStatus, setStatusTaskStatus] = useState<WebsiteProvisioningTaskStatus>("open");
  const [statusCurrentStep, setStatusCurrentStep] = useState<WebsiteProvisioningStep>("ready_for_provisioning");
  const [statusNextOperatorAction, setStatusNextOperatorAction] = useState("");
  const [statusOperatorNote, setStatusOperatorNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selectedSummary = resource.data?.item ?? null;
  const catalog = resource.data?.catalog ?? null;

  useEffect(() => {
    if (!selectedSummary) {
      setBusinessName(selectedState.tenant_name ?? "");
      setPrimaryContactName("");
      setPrimaryContactEmail("");
      setPrimaryContactPhone("");
      setTriggerKind("confirmed_close");
      setWebsiteDomain("");
      setWebsiteObjective("");
      setPromisedCapabilities("");
      setTimelineDiscussed("");
      setEscalationsOrCaveats(selectedState.onboarding_notes ?? "");
      setPaymentReference("");
      setNextCustomerAction("");
      setNextAetherproAction(
        selectedState.deposit_status === "paid" ||
          selectedState.final_setup_status === "paid" ||
          selectedState.monthly_status === "active"
          ? "Review website intake, assign builder, and start provisioning."
          : "Confirm payment before website provisioning begins."
      );
      setAccountableOwner(selectedState.sales_rep_handle ?? "");
      setStatusTaskStatus("open");
      setStatusCurrentStep("ready_for_provisioning");
      setStatusNextOperatorAction("");
      setStatusOperatorNote("");
      return;
    }

    setBusinessName(selectedSummary.business_name);
    setPrimaryContactName(selectedSummary.primary_contact_name);
    setPrimaryContactEmail(selectedSummary.primary_contact_email);
    setPrimaryContactPhone(selectedSummary.primary_contact_phone);
    setTriggerKind(selectedSummary.trigger_kind);
    setWebsiteDomain(selectedSummary.website_domain ?? "");
    setWebsiteObjective(selectedSummary.website_objective ?? "");
    setPromisedCapabilities(capabilityListToText(selectedSummary.promised_capabilities));
    setTimelineDiscussed(selectedSummary.timeline_discussed ?? "");
    setEscalationsOrCaveats(selectedSummary.escalations_or_caveats ?? "");
    setPaymentReference(selectedSummary.payment_reference ?? "");
    setNextCustomerAction(selectedSummary.next_customer_action ?? "");
    setNextAetherproAction(selectedSummary.next_aetherpro_action ?? "");
    setAccountableOwner(selectedSummary.accountable_owner ?? "");
    setStatusTaskStatus(selectedSummary.task_status);
    setStatusCurrentStep(selectedSummary.current_step);
    setStatusNextOperatorAction(selectedSummary.next_operator_action);
    setStatusOperatorNote("");
  }, [selectedState, selectedSummary]);

  const paymentSummary = useMemo(() => {
    if (selectedSummary?.payment_state === "paid") {
      return "Website payment is recorded for this provisioning task.";
    }

    if (
      selectedState.deposit_status === "paid" ||
      selectedState.final_setup_status === "paid" ||
      selectedState.monthly_status === "active"
    ) {
      return "A paid billing state already exists for this tenant.";
    }

    return "No paid billing state is recorded yet for this tenant.";
  }, [selectedState, selectedSummary]);

  const buildCheckoutUrl = useMemo(
    () =>
      buildTenantAwareCheckoutUrl({
        baseUrl: catalog?.payment_link_build,
        tenantId,
        customerEmail: primaryContactEmail.trim().toLowerCase() || null
      }),
    [catalog?.payment_link_build, tenantId, primaryContactEmail]
  );

  const monthlyCheckoutUrl = useMemo(
    () =>
      buildTenantAwareCheckoutUrl({
        baseUrl: catalog?.payment_link_monthly,
        tenantId,
        customerEmail: primaryContactEmail.trim().toLowerCase() || null
      }),
    [catalog?.payment_link_monthly, tenantId, primaryContactEmail]
  );

  const saveProvisioning = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setIsSaving(true);
    try {
      const saved = await portalApi.upsertWebsiteProvisioning({
        tenant_id: tenantId,
        business_name: businessName.trim(),
        primary_contact_name: primaryContactName.trim(),
        primary_contact_email: primaryContactEmail.trim().toLowerCase(),
        primary_contact_phone: primaryContactPhone.trim(),
        deployment_family: "ai-website",
        offer_key: "ai_website_wedge",
        trigger_kind: triggerKind,
        website_domain: websiteDomain.trim() || undefined,
        website_objective: websiteObjective.trim() || undefined,
        promised_capabilities: capabilityTextToList(promisedCapabilities),
        timeline_discussed: timelineDiscussed.trim() || undefined,
        escalations_or_caveats: escalationsOrCaveats.trim() || undefined,
        payment_reference: paymentReference.trim() || undefined,
        next_customer_action: nextCustomerAction.trim() || undefined,
        next_aetherpro_action: nextAetherproAction.trim() || undefined,
        accountable_owner: accountableOwner.trim() || undefined
      });
      await resource.reload();
      setStatusTaskStatus(saved.task_status);
      setStatusCurrentStep(saved.current_step);
      setStatusNextOperatorAction(saved.next_operator_action);
      setInfo("AI website provisioning handoff saved and auditable task updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save website provisioning handoff");
    } finally {
      setIsSaving(false);
    }
  };

  const saveStatus = async () => {
    if (!selectedSummary) {
      return;
    }

    setError(null);
    setInfo(null);
    setIsSaving(true);
    try {
      await portalApi.updateWebsiteProvisioningStatus({
        tenant_id: tenantId,
        task_id: selectedSummary.task_id,
        task_status: statusTaskStatus,
        current_step: statusCurrentStep,
        next_operator_action: statusNextOperatorAction.trim(),
        operator_note: statusOperatorNote.trim() || undefined
      });
      await resource.reload();
      setStatusOperatorNote("");
      setInfo("Provisioning task status updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update provisioning task status");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="panel stack">
      <h3>AI Website Post-Close / Provisioning</h3>
      <p className="muted">
        Smallest complete post-close flow: capture the website handoff, attach it to the tenant, create the closed-won CRM deal,
        generate the provisioning task, and surface the next operator action.
      </p>

      <div className="grid-2">
        <div>
          <div className="label">Approved offer</div>
          <code>{catalog?.offer_label || "AI Website Wedge"}</code>
        </div>
        <div>
          <div className="label">Approved pricing</div>
          <code>
            Build {formatUsd(catalog?.build_price_cents ?? 19_700)} · Monthly {formatUsd(catalog?.monthly_price_cents ?? 19_700)}
          </code>
        </div>
        <div>
          <div className="label">Billing gate</div>
          <code>{paymentSummary}</code>
        </div>
        <div>
          <div className="label">Current tenant billing state</div>
          <code>
            deposit={selectedState.deposit_status} · final={selectedState.final_setup_status} · monthly=
            {selectedState.monthly_status}
          </code>
        </div>
        <div>
          <div className="label">Website payment path</div>
          <code>{catalog?.pricing_status || "missing_payment_links"}</code>
        </div>
        <div>
          <div className="label">Operator guidance</div>
          <code>{catalog?.operator_guidance || "Website offer catalog not loaded yet."}</code>
        </div>
      </div>

      {catalog?.promo_note ? (
        <div className="alert alert-warning">
          <strong>Promo note:</strong> {catalog.promo_note}
        </div>
      ) : null}

      <section className="panel stack">
        <h4>Website Payment Actions</h4>
        <div className="grid-2">
          <div className="stack">
            <div className="label">Build checkout</div>
            <code>{buildCheckoutUrl || "n/a"}</code>
            {buildCheckoutUrl ? (
              <div className="grid-2">
                <a className="btn btn-secondary" href={buildCheckoutUrl} target="_blank" rel="noreferrer">
                  Open Build Checkout
                </a>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void navigator.clipboard.writeText(buildCheckoutUrl)}
                >
                  Copy Build Link
                </button>
              </div>
            ) : (
              <div className="muted">Build checkout link is not configured in this runtime yet.</div>
            )}
          </div>
          <div className="stack">
            <div className="label">Monthly checkout</div>
            <code>{monthlyCheckoutUrl || "n/a"}</code>
            {monthlyCheckoutUrl ? (
              <div className="grid-2">
                <a className="btn btn-secondary" href={monthlyCheckoutUrl} target="_blank" rel="noreferrer">
                  Open Monthly Checkout
                </a>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void navigator.clipboard.writeText(monthlyCheckoutUrl)}
                >
                  Copy Monthly Link
                </button>
              </div>
            ) : (
              <div className="muted">Monthly checkout link is not configured in this runtime yet.</div>
            )}
          </div>
        </div>
      </section>

      <form className="stack" onSubmit={saveProvisioning}>
        <div className="grid-2">
          <div className="form-row">
            <label className="label">Business name</label>
            <input className="input" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
          </div>
          <div className="form-row">
            <label className="label">Trigger</label>
            <select className="select" value={triggerKind} onChange={(e) => setTriggerKind(e.target.value as typeof triggerKind)}>
              <option value="confirmed_close">confirmed_close</option>
              <option value="payment_confirmed">payment_confirmed</option>
            </select>
          </div>
          <div className="form-row">
            <label className="label">Primary contact name</label>
            <input className="input" value={primaryContactName} onChange={(e) => setPrimaryContactName(e.target.value)} required />
          </div>
          <div className="form-row">
            <label className="label">Primary contact email</label>
            <input
              className="input"
              type="email"
              value={primaryContactEmail}
              onChange={(e) => setPrimaryContactEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label className="label">Primary contact phone</label>
            <input className="input" value={primaryContactPhone} onChange={(e) => setPrimaryContactPhone(e.target.value)} required />
          </div>
          <div className="form-row">
            <label className="label">Website domain</label>
            <input className="input" value={websiteDomain} onChange={(e) => setWebsiteDomain(e.target.value)} placeholder="example.com" />
          </div>
          <div className="form-row">
            <label className="label">Timeline discussed</label>
            <input
              className="input"
              value={timelineDiscussed}
              onChange={(e) => setTimelineDiscussed(e.target.value)}
              placeholder="Launch target, urgency, dependencies"
            />
          </div>
          <div className="form-row">
            <label className="label">Payment reference</label>
            <input
              className="input"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Stripe session, invoice, close note"
            />
          </div>
          <div className="form-row">
            <label className="label">Accountable owner</label>
            <input
              className="input"
              value={accountableOwner}
              onChange={(e) => setAccountableOwner(e.target.value)}
              placeholder="sales rep, operator, builder"
            />
          </div>
        </div>

        <div className="form-row">
          <label className="label">Website objective</label>
          <textarea
            className="textarea"
            rows={3}
            value={websiteObjective}
            onChange={(e) => setWebsiteObjective(e.target.value)}
            placeholder="What the website needs to do for this customer"
          />
        </div>
        <div className="form-row">
          <label className="label">Promised capabilities</label>
          <textarea
            className="textarea"
            rows={3}
            value={promisedCapabilities}
            onChange={(e) => setPromisedCapabilities(e.target.value)}
            placeholder="Lead capture, AI chat, booking, CRM handoff"
          />
        </div>
        <div className="form-row">
          <label className="label">Customer next action</label>
          <textarea
            className="textarea"
            rows={2}
            value={nextCustomerAction}
            onChange={(e) => setNextCustomerAction(e.target.value)}
          />
        </div>
        <div className="form-row">
          <label className="label">AetherPro next action</label>
          <textarea
            className="textarea"
            rows={2}
            value={nextAetherproAction}
            onChange={(e) => setNextAetherproAction(e.target.value)}
          />
        </div>
        <div className="form-row">
          <label className="label">Escalations / caveats</label>
          <textarea
            className="textarea"
            rows={3}
            value={escalationsOrCaveats}
            onChange={(e) => setEscalationsOrCaveats(e.target.value)}
          />
        </div>

        <div>
          <button className="btn btn-primary" type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Website Provisioning Handoff"}
          </button>
        </div>
      </form>

      {resource.isLoading ? <p className="muted">Loading website provisioning state...</p> : null}
      {resource.error ? <div className="alert alert-error">{resource.error}</div> : null}

      {selectedSummary ? (
        <section className="panel stack">
          <h4>Provisioning task + next operator action</h4>
          <div className="grid-2">
            <div>
              <div className="label">Task status</div>
              <code>{selectedSummary.task_status}</code>
            </div>
            <div>
              <div className="label">Current step</div>
              <code>{selectedSummary.current_step}</code>
            </div>
            <div>
              <div className="label">Next operator action</div>
              <code>{selectedSummary.next_operator_action}</code>
            </div>
            <div>
              <div className="label">Payment state</div>
              <code>{selectedSummary.payment_state}</code>
            </div>
            <div>
              <div className="label">Company / contact / deal / task</div>
              <code className="overflow-anywhere">
                {selectedSummary.company_id} · {selectedSummary.primary_contact_id} · {selectedSummary.deal_id} ·{" "}
                {selectedSummary.task_id}
              </code>
            </div>
            <div>
              <div className="label">Latest evidence count</div>
              <code>{selectedSummary.latest_evidence.length}</code>
            </div>
          </div>

          {canManageOperations ? (
            <div className="stack">
              <div className="grid-2">
                <div className="form-row">
                  <label className="label">Update task status</label>
                  <select
                    className="select"
                    value={statusTaskStatus}
                    onChange={(e) => setStatusTaskStatus(e.target.value as WebsiteProvisioningTaskStatus)}
                  >
                    <option value="blocked">blocked</option>
                    <option value="open">open</option>
                    <option value="in_progress">in_progress</option>
                    <option value="completed">completed</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </div>
                <div className="form-row">
                  <label className="label">Update current step</label>
                  <select
                    className="select"
                    value={statusCurrentStep}
                    onChange={(e) => setStatusCurrentStep(e.target.value as WebsiteProvisioningStep)}
                  >
                    <option value="awaiting_payment">awaiting_payment</option>
                    <option value="ready_for_provisioning">ready_for_provisioning</option>
                    <option value="in_progress">in_progress</option>
                    <option value="completed">completed</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <label className="label">Next operator action</label>
                <textarea
                  className="textarea"
                  rows={2}
                  value={statusNextOperatorAction}
                  onChange={(e) => setStatusNextOperatorAction(e.target.value)}
                />
              </div>
              <div className="form-row">
                <label className="label">Operator note (audit payload)</label>
                <textarea
                  className="textarea"
                  rows={2}
                  value={statusOperatorNote}
                  onChange={(e) => setStatusOperatorNote(e.target.value)}
                />
              </div>
              <div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={isSaving || statusNextOperatorAction.trim().length < 2}
                  onClick={() => void saveStatus()}
                >
                  {isSaving ? "Saving..." : "Update Provisioning Status"}
                </button>
              </div>
            </div>
          ) : null}

          {selectedSummary.latest_evidence.length ? (
            <div className="stack">
              <div className="label">Latest evidence</div>
              {selectedSummary.latest_evidence.map((item) => (
                <code key={item.id} className="overflow-anywhere">
                  {item.created_at} · {item.action} · {item.result} · {item.id}
                </code>
              ))}
            </div>
          ) : null}
        </section>
      ) : (
        <div className="alert alert-warning">
          No AI website provisioning task exists yet for this tenant. Saving the handoff will create the customer-facing company,
          contact, closed-won deal, provisioning task, and evidence trail.
        </div>
      )}

      {error ? <div className="alert alert-error">{error}</div> : null}
      {info ? <div className="alert alert-warning">{info}</div> : null}
    </section>
  );
}
