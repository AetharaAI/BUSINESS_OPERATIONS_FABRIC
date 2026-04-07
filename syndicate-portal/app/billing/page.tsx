"use client";

import { useCallback } from "react";
import { PortalNav } from "@/components/PortalNav";
import { ErrorPanel, LoadingPanel } from "@/components/LoadStates";
import { portalApi } from "@/lib/client/api";
import { useApiResource } from "@/lib/client/use-api-resource";

export default function BillingPage() {
  const loader = useCallback(async () => {
    const [billing, billingLink] = await Promise.all([portalApi.billingDocuments(), portalApi.billingLink()]);
    return { billing, billingLink };
  }, []);
  const { data, error, isLoading, reload } = useApiResource(loader);

  return (
    <>
      <PortalNav />
      <main className="content">
        <div className="container stack">
          <section className="panel stack">
            <h1>Billing & Documents</h1>
            <p className="muted">Review your onboarding payment status, signed documents, and billing activity.</p>
          </section>

          {isLoading ? <LoadingPanel label="Loading billing and documents..." /> : null}
          {error ? <ErrorPanel message={error} onRetry={() => void reload()} /> : null}

          {data ? (
            <>
              <section className="panel stack">
                <h2>Current Status</h2>
                <div className="grid-2">
                  <div>
                    <div className="label">Plan</div>
                    <div className="value">{data.billing.selected_plan}</div>
                  </div>
                  <div>
                    <div className="label">Agreement</div>
                    <div className="value">{data.billing.agreement_status}</div>
                  </div>
                  <div>
                    <div className="label">Deposit</div>
                    <div className="value">{data.billing.deposit_status}</div>
                  </div>
                  <div>
                    <div className="label">Final setup balance</div>
                    <div className="value">{data.billing.final_setup_status}</div>
                  </div>
                  <div>
                    <div className="label">Monthly service</div>
                    <div className="value">{data.billing.monthly_status}</div>
                  </div>
                </div>
              </section>

              <section className="panel stack">
                <h2>Payment Actions</h2>
                <div className="grid-2">
                  <div className="stack">
                    <div className="label">To pay the onboarding deposit, click below.</div>
                    {data.billing.payment_link_deposit ? (
                      <a className="btn btn-cta" href={data.billing.payment_link_deposit} target="_blank" rel="noreferrer">
                        {data.billing.deposit_status === "paid" ? "Deposit Paid" : "Pay Deposit"}
                      </a>
                    ) : (
                      <button className="btn btn-disabled" type="button" disabled>
                        Pay Deposit
                      </button>
                    )}
                    {!data.billing.payment_link_deposit ? <div className="muted">Deposit payment link is not configured yet.</div> : null}
                  </div>
                  <div className="stack">
                    <div className="label">To pay the final setup balance, click below.</div>
                    {data.billing.payment_link_final_setup ? (
                      <a className="btn btn-cta" href={data.billing.payment_link_final_setup} target="_blank" rel="noreferrer">
                        {data.billing.final_setup_status === "paid" ? "Final Setup Paid" : "Pay Final Setup"}
                      </a>
                    ) : (
                      <button className="btn btn-disabled" type="button" disabled>
                        Pay Final Setup
                      </button>
                    )}
                    {!data.billing.payment_link_final_setup ? (
                      <div className="muted">Final setup payment link is not configured yet.</div>
                    ) : null}
                  </div>
                  <div className="stack">
                    <div className="label">When monthly service is ready, use this action.</div>
                    {data.billingLink.manage_url ? (
                      <a className="btn btn-cta" href={data.billingLink.manage_url} target="_blank" rel="noreferrer">
                        {data.billing.monthly_status === "active" ? "Manage Monthly Service" : "Start Monthly Service"}
                      </a>
                    ) : (
                      <button className="btn btn-disabled" type="button" disabled>
                        Start Monthly Service
                      </button>
                    )}
                    {!data.billingLink.manage_url ? (
                      <div className="muted">Monthly service billing action will be enabled when available.</div>
                    ) : null}
                  </div>
                </div>
              </section>

              <section id="signed-documents" className="panel stack">
                <h2>Signed Documents</h2>
                {data.billing.signed_documents.length > 0 ? (
                  <ul>
                    {data.billing.signed_documents.map((doc) => (
                      <li key={doc.id}>
                        <a href={doc.url} target="_blank" rel="noreferrer">
                          {doc.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="alert alert-warning">Signed agreement documents will appear here once they are linked to your account.</div>
                )}
              </section>

              <section className="panel stack">
                <h2>Invoices & Receipts</h2>
                {data.billing.invoices.length > 0 ? (
                  <ul>
                    {data.billing.invoices.map((invoice, index) => (
                      <li key={index}>
                        <code>{JSON.stringify(invoice)}</code>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="alert alert-warning">
                    Invoices and payment receipts will appear here as billing activity is recorded.
                  </div>
                )}
              </section>
            </>
          ) : null}
        </div>
      </main>
    </>
  );
}
