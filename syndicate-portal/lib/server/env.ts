const parseBool = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === "true";
};

const normalizeInviteDeliveryMode = (value: string | undefined): "email" | "direct_link" | "both" => {
  if (value === "direct_link" || value === "both") {
    return value;
  }

  return "email";
};

const normalizeRedwatchClientMode = (value: string | undefined): "memory" | "http" | "disabled" => {
  if (value === "memory" || value === "http" || value === "disabled") {
    return value;
  }

  return process.env.NODE_ENV === "production" ? "disabled" : "memory";
};

const optionalEnv = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const serverEnv = {
  voiceOpsApiBaseUrl: process.env.VOICEOPS_API_BASE_URL || "https://voice.aetherpro.us",
  portalPublicBaseUrl: process.env.PORTAL_PUBLIC_BASE_URL || "",
  cookieSecure: parseBool(process.env.PORTAL_COOKIE_SECURE, process.env.NODE_ENV === "production"),
  voiceOpsPlatformAdminKey: process.env.VOICEOPS_PLATFORM_ADMIN_KEY || "",
  portalInviteTokenSecret: process.env.PORTAL_INVITE_TOKEN_SECRET || "",
  portalWorkforceDirectoryJson: process.env.PORTAL_WORKFORCE_DIRECTORY_JSON || "",
  voiceOpsPasswordResetPath: process.env.VOICEOPS_PASSWORD_RESET_PATH || "",
  crmDatabaseUrl: process.env.CRM_DATABASE_URL || "",
  bofWorkspaceId: process.env.BOF_WORKSPACE_ID || "",
  bofTenantId: process.env.BOF_TENANT_ID || "",
  workforceDefaultOperatorEmail: process.env.WORKFORCE_DEFAULT_OPERATOR_EMAIL || "",
  workforceW8BenFormUrl: process.env.WORKFORCE_W8BEN_FORM_URL || "https://www.irs.gov/pub/irs-pdf/fw8ben.pdf",
  workforceStorageMode: process.env.WORKFORCE_STORAGE_MODE || (process.env.NODE_ENV === "test" ? "memory" : "disabled"),
  workforceStorageBucket: process.env.WORKFORCE_STORAGE_BUCKET || "",
  workforceStorageRegion: process.env.WORKFORCE_STORAGE_REGION || "us-east-1",
  workforceStorageEndpoint: process.env.WORKFORCE_STORAGE_ENDPOINT || "",
  workforceStorageAccessKeyId: process.env.WORKFORCE_STORAGE_ACCESS_KEY_ID || "",
  workforceStorageSecretAccessKey: process.env.WORKFORCE_STORAGE_SECRET_ACCESS_KEY || "",
  workforceStorageForcePathStyle: parseBool(process.env.WORKFORCE_STORAGE_FORCE_PATH_STYLE, true),
  workforceInviteDeliveryMode: normalizeInviteDeliveryMode(process.env.WORKFORCE_INVITE_DELIVERY_MODE),
  redwatchClientMode: normalizeRedwatchClientMode(process.env.REDWATCH_CLIENT_MODE),
  redwatchServiceBaseUrl: process.env.REDWATCH_SERVICE_BASE_URL || "",
  redwatchApiKeyHeaderName: process.env.REDWATCH_API_KEY_HEADER_NAME || "x-rw-api-key",
  redwatchApiKey: process.env.REDWATCH_API_KEY || "",
  redwatchEmitEventPath: optionalEnv(process.env.REDWATCH_EMIT_EVENT_PATH),
  redwatchEmitReceiptSyncPath: optionalEnv(process.env.REDWATCH_EMIT_RECEIPT_SYNC_PATH),
  redwatchAttachEvidencePath: optionalEnv(process.env.REDWATCH_ATTACH_EVIDENCE_PATH),
  redwatchQueryReceiptPath: optionalEnv(process.env.REDWATCH_QUERY_RECEIPT_PATH),
  redwatchVerifyChainPath: optionalEnv(process.env.REDWATCH_VERIFY_CHAIN_PATH),
  pandadocMode: process.env.PANDADOC_MODE || "stub",
  pandadocApiBaseUrl: process.env.PANDADOC_API_BASE_URL || "https://api.pandadoc.com/public/v1",
  pandadocApiKey: process.env.PANDADOC_API_KEY || "",
  pandadocWebhookSecret: process.env.PANDADOC_WEBHOOK_SECRET || "",
  portalAiWebsiteOfferLabel: process.env.PORTAL_AI_WEBSITE_OFFER_LABEL || "AI Website Wedge",
  portalAiWebsiteBuildPriceCents: process.env.PORTAL_AI_WEBSITE_BUILD_PRICE_CENTS || "19700",
  portalAiWebsiteMonthlyPriceCents: process.env.PORTAL_AI_WEBSITE_MONTHLY_PRICE_CENTS || "19700",
  portalAiWebsiteBuildStripePriceId: process.env.PORTAL_AI_WEBSITE_BUILD_STRIPE_PRICE_ID || "",
  portalAiWebsiteMonthlyStripePriceId: process.env.PORTAL_AI_WEBSITE_MONTHLY_STRIPE_PRICE_ID || "",
  portalAiWebsiteBuildPaymentLink: process.env.PORTAL_AI_WEBSITE_BUILD_PAYMENT_LINK || "",
  portalAiWebsiteMonthlyPaymentLink: process.env.PORTAL_AI_WEBSITE_MONTHLY_PAYMENT_LINK || "",
  portalAiWebsitePromoNote: optionalEnv(process.env.PORTAL_AI_WEBSITE_PROMO_NOTE),
  portalBillingProvider: process.env.PORTAL_BILLING_PROVIDER || "unconfigured",
  portalBillingManageUrlTemplate: process.env.PORTAL_BILLING_MANAGE_URL_TEMPLATE || "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || ""
};
