import type { TenantBillingState, TenantBillingStateUpdate } from "@/lib/types/portal";

const hasOwn = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key);

export const normalizeAgreementFields = (state: TenantBillingState): TenantBillingState => {
  const agreementProviderDocumentId = state.agreement_provider_document_id ?? state.docusign_envelope_id ?? null;

  return {
    ...state,
    agreement_provider: state.agreement_provider ?? (state.docusign_envelope_id ? "docusign" : null),
    agreement_provider_document_id: agreementProviderDocumentId,
    agreement_number: state.agreement_number ?? null,
    agreement_signed_at: state.agreement_signed_at ?? null,
    // Compatibility alias: keep legacy reads working until the persisted shape is fully migrated.
    docusign_envelope_id: state.docusign_envelope_id ?? agreementProviderDocumentId
  };
};

export const mergeAgreementFields = (
  current: TenantBillingState,
  update: TenantBillingStateUpdate
): Pick<
  TenantBillingState,
  "agreement_provider" | "agreement_provider_document_id" | "agreement_number" | "agreement_signed_at" | "docusign_envelope_id"
> => {
  const hasAgreementProvider = hasOwn(update, "agreement_provider");
  const hasAgreementProviderDocumentId = hasOwn(update, "agreement_provider_document_id");
  const hasLegacyDocuSignEnvelopeId = hasOwn(update, "docusign_envelope_id");

  const agreementProviderDocumentId = hasAgreementProviderDocumentId
    ? update.agreement_provider_document_id ?? null
    : hasLegacyDocuSignEnvelopeId
      ? update.docusign_envelope_id ?? null
      : current.agreement_provider_document_id ?? current.docusign_envelope_id ?? null;

  return {
    agreement_provider: hasAgreementProvider
      ? update.agreement_provider ?? null
      : current.agreement_provider ?? (hasLegacyDocuSignEnvelopeId && update.docusign_envelope_id ? "docusign" : null),
    agreement_provider_document_id: agreementProviderDocumentId,
    agreement_number: hasOwn(update, "agreement_number") ? update.agreement_number ?? null : current.agreement_number ?? null,
    agreement_signed_at: hasOwn(update, "agreement_signed_at") ? update.agreement_signed_at ?? null : current.agreement_signed_at ?? null,
    // Compatibility alias: legacy callers may still send or read docusign_envelope_id.
    docusign_envelope_id: agreementProviderDocumentId
  };
};
