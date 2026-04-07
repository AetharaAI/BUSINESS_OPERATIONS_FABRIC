"use client";

import { useCallback } from "react";
import { PortalNav } from "@/components/PortalNav";
import { ErrorPanel, LoadingPanel } from "@/components/LoadStates";
import { portalApi } from "@/lib/client/api";
import { useApiResource } from "@/lib/client/use-api-resource";

export default function BillingPage() {
  const loader = useCallback(() => portalApi.billingDocuments(), []);
  const { data, error, isLoading, reload } = useApiResource(loader);

  return (
    <>
      <PortalNav />
      <main className="content">
        <div className="container stack">
          <section className="panel stack">
            <h1>Billing & Documents</h1>
            <p className="muted">Customer-facing billing/document status surface for onboarding and live service state.</p>
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
                    <div className="value">{data.selected_plan}</div>
                  </div>
                  <div>
                    <div className="label">Agreement</div>
                    <div className="value">{data.agreement_status}</div>
                  </div>
                  <div>
                    <div className="label">Deposit</div>
                    <div className="value">{data.deposit_status}</div>
                  </div>
                  <div>
                    <div className="label">Final setup balance</div>
                    <div className="value">{data.final_setup_status}</div>
                  </div>
                  <div>
                    <div className="label">Monthly service</div>
                    <div className="value">{data.monthly_status}</div>
                  </div>
                </div>
                <div className="grid-2">
                  <div className="stack">
                    <div className="label">Deposit payment action</div>
                    {data.payment_link_deposit ? (
                      <a className="btn btn-secondary" href={data.payment_link_deposit} target="_blank" rel="noreferrer">
                        Pay Deposit
                      </a>
                    ) : (
                      <div className="muted">No deposit link configured.</div>
                    )}
                  </div>
                  <div className="stack">
                    <div className="label">Final setup payment action</div>
                    {data.payment_link_final_setup ? (
                      <a className="btn btn-secondary" href={data.payment_link_final_setup} target="_blank" rel="noreferrer">
                        Pay Final Setup
                      </a>
                    ) : (
                      <div className="muted">No final setup link configured.</div>
                    )}
                  </div>
                </div>
              </section>

              <section className="panel stack">
                <h2>Signed Documents</h2>
                {data.signed_documents.length > 0 ? (
                  <ul>
                    {data.signed_documents.map((doc) => (
                      <li key={doc.id}>
                        <a href={doc.url} target="_blank" rel="noreferrer">
                          {doc.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="alert alert-warning">Signed documents will appear here once linked from DocuSign.</div>
                )}
              </section>

              <section className="panel stack">
                <h2>Invoices & Receipts</h2>
                {data.invoices.length > 0 ? (
                  <ul>
                    {data.invoices.map((invoice, index) => (
                      <li key={index}>
                        <code>{JSON.stringify(invoice)}</code>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="alert alert-warning">Invoice and receipt history will appear here once billing sync is connected.</div>
                )}
              </section>
            </>
          ) : null}
        </div>
      </main>
    </>
  );
}
