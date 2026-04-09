const parseBool = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === "true";
};

export const serverEnv = {
  voiceOpsApiBaseUrl: process.env.VOICEOPS_API_BASE_URL || "https://voice.aetherpro.us",
  portalPublicBaseUrl: process.env.PORTAL_PUBLIC_BASE_URL || "",
  cookieSecure: parseBool(process.env.PORTAL_COOKIE_SECURE, process.env.NODE_ENV === "production"),
  voiceOpsPlatformAdminKey: process.env.VOICEOPS_PLATFORM_ADMIN_KEY || "",
  portalInviteTokenSecret: process.env.PORTAL_INVITE_TOKEN_SECRET || "",
  voiceOpsPasswordResetPath: process.env.VOICEOPS_PASSWORD_RESET_PATH || "",
  portalBillingProvider: process.env.PORTAL_BILLING_PROVIDER || "unconfigured",
  portalBillingManageUrlTemplate: process.env.PORTAL_BILLING_MANAGE_URL_TEMPLATE || "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || ""
};
