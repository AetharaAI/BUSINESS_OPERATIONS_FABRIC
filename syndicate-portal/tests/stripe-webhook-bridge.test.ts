import { beforeEach, describe, expect, it, vi } from "vitest";

const constructEventMock = vi.fn();
const retrieveSessionMock = vi.fn();

vi.mock("stripe", () => {
  return {
    default: class StripeMock {
      webhooks = {
        constructEvent: constructEventMock
      };

      checkout = {
        sessions: {
          retrieve: retrieveSessionMock
        }
      };
    }
  };
});

const state = {
  tenant_id: "tenant_starter_001",
  tenant_name: "Starter Test Co",
  selected_plan: "starter" as const,
  agreement_status: "draft" as const,
  deposit_status: "pending" as const,
  final_setup_status: "pending" as const,
  monthly_status: "inactive" as const,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_product_id_reference: "prod_starter",
  stripe_price_id_deposit: "price_deposit_123",
  stripe_price_id_final_setup: "price_final_123",
  stripe_price_id_monthly: "price_monthly_123",
  payment_link_deposit: "https://buy.stripe.test/deposit",
  payment_link_final_setup: "https://buy.stripe.test/final",
  portal_invite_status: "not_sent" as const,
  assigned_user_ids: [],
  updated_at: "2026-07-18T00:00:00.000Z"
};

const getByTenantIdMock = vi.fn();
const findByStripeCustomerIdMock = vi.fn();
const findCandidatesByPriceIdMock = vi.fn();
const applyStripeUpdateMock = vi.fn();

vi.mock("@/lib/server/billing-state-store", () => ({
  billingStateStore: {
    getByTenantId: getByTenantIdMock,
    findByStripeCustomerId: findByStripeCustomerIdMock,
    findCandidatesByPriceId: findCandidatesByPriceIdMock,
    applyStripeUpdate: applyStripeUpdateMock
  }
}));

const emitWorkforceReceiptMock = vi.fn();
const withCrmContextMock = vi.fn(async (_ctx, run) => run({ tx: "mock" }));
const markWebsitePaymentConfirmedMock = vi.fn();

vi.mock("@/lib/server/crm/db-context", () => ({
  withCrmContext: withCrmContextMock
}));

vi.mock("@/lib/server/workforce/receipts", () => ({
  emitWorkforceReceipt: emitWorkforceReceiptMock
}));

vi.mock("@/lib/server/website-provisioning/service", () => ({
  aiWebsiteProvisioningService: {
    markPaymentConfirmed: markWebsitePaymentConfirmedMock
  }
}));

describe("stripe webhook -> BOF evidence bridge", () => {
  beforeEach(() => {
    vi.resetModules();
    constructEventMock.mockReset();
    retrieveSessionMock.mockReset();
    getByTenantIdMock.mockReset();
    findByStripeCustomerIdMock.mockReset();
    findCandidatesByPriceIdMock.mockReset();
    applyStripeUpdateMock.mockReset();
    emitWorkforceReceiptMock.mockReset();
    withCrmContextMock.mockClear();
    markWebsitePaymentConfirmedMock.mockReset();

    process.env.STRIPE_SECRET_KEY = "sk_test_bridge";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_bridge";
    process.env.BOF_WORKSPACE_ID = "workspace_bridge_001";
    process.env.REDWATCH_CLIENT_MODE = "memory";

    getByTenantIdMock.mockReturnValue(state);
    findCandidatesByPriceIdMock.mockReturnValue([state]);
    applyStripeUpdateMock.mockImplementation((patch) => ({
      ...state,
      ...patch
    }));
  });

  it("advances starter deposit state and queues non-blocking billing evidence", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123"
        }
      }
    });

    retrieveSessionMock.mockResolvedValue({
      id: "cs_test_123",
      customer: "cus_test_123",
      subscription: null,
      metadata: {
        tenant_id: "tenant_starter_001"
      },
      line_items: {
        data: [
          {
            price: {
              id: "price_deposit_123"
            }
          }
        ]
      }
    });

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const request = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "sig_test"
      },
      body: JSON.stringify({ any: "payload" })
    });

    const response = await POST(request as any);
    expect(response.status).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(applyStripeUpdateMock).toHaveBeenCalledWith({
      tenant_id: "tenant_starter_001",
      stripe_customer_id: "cus_test_123",
      stripe_subscription_id: null,
      deposit_status: "paid"
    });

    expect(withCrmContextMock).toHaveBeenCalledWith(
      {
        workspace_id: "workspace_bridge_001",
        tenant_id: "tenant_starter_001"
      },
      expect.any(Function)
    );

    expect(emitWorkforceReceiptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "workspace_bridge_001",
        tenantId: "tenant_starter_001",
        actorType: "service",
        action: "payment.deposit.paid",
        targetType: "tenant_billing_state",
        targetId: "tenant_starter_001",
        result: "success",
        payload: expect.objectContaining({
          stripe_event_type: "checkout.session.completed",
          stripe_session_id: "cs_test_123",
          stripe_customer_id: "cus_test_123",
          stripe_price_id: "price_deposit_123",
          deposit_status: "paid",
          final_setup_status: "pending",
          monthly_status: "inactive"
        })
      })
    );
  });

  it("routes tenant-aware AI website build checkout completion into the provisioning task bridge", async () => {
    process.env.PORTAL_AI_WEBSITE_BUILD_STRIPE_PRICE_ID = "price_ai_website_build_123";

    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_website_build"
        }
      }
    });

    retrieveSessionMock.mockResolvedValue({
      id: "cs_test_website_build",
      client_reference_id: "tenant_starter_001",
      customer: "cus_test_website_123",
      subscription: null,
      metadata: {},
      line_items: {
        data: [
          {
            price: {
              id: "price_ai_website_build_123"
            }
          }
        ]
      }
    });

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const request = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "sig_test"
      },
      body: JSON.stringify({ any: "payload" })
    });

    const response = await POST(request as any);
    expect(response.status).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(applyStripeUpdateMock).toHaveBeenCalledWith({
      tenant_id: "tenant_starter_001",
      stripe_customer_id: "cus_test_website_123",
      stripe_subscription_id: null
    });

    expect(markWebsitePaymentConfirmedMock).toHaveBeenCalledWith(
      {
        workspace_id: "workspace_bridge_001",
        tenant_id: "tenant_starter_001"
      },
      expect.objectContaining({
        payment_reference: "cs_test_website_build",
        payment_kind: "build"
      })
    );

    expect(emitWorkforceReceiptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "website.payment.build.paid",
        payload: expect.objectContaining({
          stripe_price_id: "price_ai_website_build_123",
          client_reference_id: "tenant_starter_001",
          deployment_family: "ai-website"
        })
      })
    );
  });
});
