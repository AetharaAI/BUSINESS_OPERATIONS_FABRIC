import { serverEnv } from "@/lib/server/env";
import { loadWebsiteStripeMapping } from "@/lib/server/stripe-plan-map";

export type WebsiteOfferCatalog = {
  deployment_family: "ai-website";
  offer_key: "ai_website_wedge";
  offer_label: string;
  build_price_cents: number;
  monthly_price_cents: number;
  payment_link_build: string | null;
  payment_link_monthly: string | null;
  pricing_status: "configured" | "missing_payment_links";
  promo_note: string | null;
  operator_guidance: string;
};

const normalizeCents = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export const resolveWebsiteOfferCatalog = (): WebsiteOfferCatalog => {
  const stripeDocMapping = loadWebsiteStripeMapping();
  const buildPrice = normalizeCents(serverEnv.portalAiWebsiteBuildPriceCents, 19_700);
  const monthlyPrice = normalizeCents(serverEnv.portalAiWebsiteMonthlyPriceCents, 19_700);
  const buildLink = serverEnv.portalAiWebsiteBuildPaymentLink || stripeDocMapping.build_payment_link;
  const monthlyLink = serverEnv.portalAiWebsiteMonthlyPaymentLink || stripeDocMapping.monthly_payment_link;
  const pricingStatus = buildLink && monthlyLink ? "configured" : "missing_payment_links";

  return {
    deployment_family: "ai-website",
    offer_key: "ai_website_wedge",
    offer_label: serverEnv.portalAiWebsiteOfferLabel || "AI Website Wedge",
    build_price_cents: buildPrice,
    monthly_price_cents: monthlyPrice,
    payment_link_build: buildLink,
    payment_link_monthly: monthlyLink,
    pricing_status: pricingStatus,
    promo_note: serverEnv.portalAiWebsitePromoNote,
    operator_guidance:
      pricingStatus === "configured"
        ? "Use the build checkout at close, then move the tenant into paid provisioning once payment is confirmed. Use the monthly checkout at go-live."
        : "Website pricing is frozen, but the website Stripe links are not fully configured in this runtime yet."
  };
};
