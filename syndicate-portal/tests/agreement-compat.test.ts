import { describe, expect, it } from "vitest";
import { mergeAgreementFields, normalizeAgreementFields } from "@/lib/shared/agreement-compat";
import { TenantBillingState, TenantBillingStateUpdate } from "@/lib/types/portal";

const baseState: TenantBillingState = {
  tenant_id: "tenant_123",
  tenant_name: "Acme Co",
  selected_plan: "starter",
  agreement_status: "draft",
  deposit_status: "pending",
  final_setup_status: "pending",
  monthly_status: "inactive",
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_product_id_reference: null,
  stripe_price_id_deposit: null,
  stripe_price_id_final_setup: null,
  stripe_price_id_monthly: null,
  payment_link_deposit: null,
  payment_link_final_setup: null,
  agreement_provider: null,
  agreement_provider_document_id: null,
  agreement_number: null,
  agreement_signed_at: null,
  docusign_envelope_id: null,
  portal_invite_status: "not_sent",
  onboarding_notes: null,
  updated_at: "2026-04-13T00:00:00.000Z"
};

describe("agreement compatibility", () => {
  it("normalizes legacy docusign ids into neutral agreement fields", () => {
    const normalized = normalizeAgreementFields({
      ...baseState,
      docusign_envelope_id: "env_123"
    });

    expect(normalized.agreement_provider).toBe("docusign");
    expect(normalized.agreement_provider_document_id).toBe("env_123");
    expect(normalized.docusign_envelope_id).toBe("env_123");
  });

  it("keeps the legacy alias in sync when neutral fields are updated", () => {
    const current = normalizeAgreementFields({
      ...baseState,
      agreement_provider: "pandadoc",
      agreement_provider_document_id: "doc_123",
      docusign_envelope_id: "doc_123"
    });

    const update: TenantBillingStateUpdate = {
      tenant_id: current.tenant_id,
      agreement_provider: "pandadoc",
      agreement_provider_document_id: "doc_456",
      agreement_number: "AGR-000123"
    };

    expect(mergeAgreementFields(current, update)).toMatchObject({
      agreement_provider: "pandadoc",
      agreement_provider_document_id: "doc_456",
      agreement_number: "AGR-000123",
      docusign_envelope_id: "doc_456"
    });
  });
});
