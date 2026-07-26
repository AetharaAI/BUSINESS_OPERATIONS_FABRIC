// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

describe("website offer catalog", () => {
  it("uses the approved website wedge pricing defaults and falls back to the Stripe canon doc links", async () => {
    delete process.env.PORTAL_AI_WEBSITE_BUILD_PAYMENT_LINK;
    delete process.env.PORTAL_AI_WEBSITE_MONTHLY_PAYMENT_LINK;

    const { resolveWebsiteOfferCatalog } = await import("@/lib/server/website-provisioning/catalog");
    const catalog = resolveWebsiteOfferCatalog();

    expect(catalog.offer_key).toBe("ai_website_wedge");
    expect(catalog.build_price_cents).toBe(19_700);
    expect(catalog.monthly_price_cents).toBe(19_700);
    expect(catalog.pricing_status).toBe("configured");
    expect(catalog.payment_link_build).toBe("https://buy.stripe.com/8x228rfJl0J381R7iQ9sk07");
    expect(catalog.payment_link_monthly).toBe("https://buy.stripe.com/00w9AT0Or8bvfuj1Yw9sk08");
  });

  it("lets explicit env values override the doc-backed website checkout links without changing the approved pricing model", async () => {
    process.env.PORTAL_AI_WEBSITE_BUILD_PAYMENT_LINK = "https://buy.stripe.test/website-build";
    process.env.PORTAL_AI_WEBSITE_MONTHLY_PAYMENT_LINK = "https://buy.stripe.test/website-monthly";
    process.env.PORTAL_AI_WEBSITE_PROMO_NOTE = "Founding website promo";

    const { resolveWebsiteOfferCatalog } = await import("@/lib/server/website-provisioning/catalog");
    const catalog = resolveWebsiteOfferCatalog();

    expect(catalog.pricing_status).toBe("configured");
    expect(catalog.payment_link_build).toBe("https://buy.stripe.test/website-build");
    expect(catalog.payment_link_monthly).toBe("https://buy.stripe.test/website-monthly");
    expect(catalog.promo_note).toBe("Founding website promo");
    expect(catalog.build_price_cents).toBe(19_700);
    expect(catalog.monthly_price_cents).toBe(19_700);
  });
});
