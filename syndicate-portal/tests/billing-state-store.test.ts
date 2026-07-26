import { afterEach, describe, expect, it } from "vitest";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const dataDir = resolve(process.cwd(), "data");

afterEach(() => {
  if (existsSync(dataDir)) {
    rmSync(dataDir, { recursive: true, force: true });
  }
});

describe("billing state starter flow", () => {
  it("seeds a new starter tenant with live deposit/final-setup buttons", async () => {
    const { billingStateStore } = await import("@/lib/server/billing-state-store");

    const state = billingStateStore.createOrReplaceForTenant({
      tenant_id: "tenant_new_current_flow",
      tenant_name: "Current Flow Test Co",
      selected_plan: "starter"
    });

    expect(state.selected_plan).toBe("starter");
    expect(state.stripe_product_id_reference).toBe("prod_UHrLmpS2WUdplv");
    expect(state.stripe_price_id_deposit).toBe("price_1TJHdxHctdijlUvAeM4CN179");
    expect(state.stripe_price_id_final_setup).toBe("price_1TJHf0HctdijlUvADGkOzf9R");
    expect(state.stripe_price_id_monthly).toBe("price_1TJHd4HctdijlUvAhlyeSHam");
    expect(state.payment_link_deposit).toBe("https://buy.stripe.com/aFabJ1bt5ezTci7gTq9sk00");
    expect(state.payment_link_final_setup).toBe("https://buy.stripe.com/6oUdR9bt5ajD4PFcDa9sk01");
    expect(state.final_setup_status).toBe("pending");
  });

  it("seeds a new growth tenant with the approved live price and payment links", async () => {
    const { billingStateStore } = await import("@/lib/server/billing-state-store");

    const state = billingStateStore.createOrReplaceForTenant({
      tenant_id: "tenant_growth_current_flow",
      tenant_name: "Growth Flow Test Co",
      selected_plan: "growth"
    });

    expect(state.selected_plan).toBe("growth");
    expect(state.stripe_product_id_reference).toBe("prod_UHrQGUZFWm1CIM");
    expect(state.stripe_price_id_deposit).toBe("price_1TJHg4HctdijlUvAkmzCRGZy");
    expect(state.stripe_price_id_final_setup).toBe("price_1TJHgwHctdijlUvAj3FQW4KJ");
    expect(state.stripe_price_id_monthly).toBe("price_1TJHhuHctdijlUvAP7FZHKo0");
    expect(state.payment_link_deposit).toBe("https://buy.stripe.com/5kQ28rdBddvPdmb8mU9sk02");
    expect(state.payment_link_final_setup).toBe("https://buy.stripe.com/9B67sLcx9dvPfujav29sk03");
    expect(state.final_setup_status).toBe("pending");
  });
});
