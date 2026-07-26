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
  tenant_id: "tenant_starter_live_flow",
  tenant_name: "Starter Live Flow Co",
  selected_plan: "starter" as const,
  agreement_status: "draft" as const,
  deposit_status: "pending" as const,
  final_setup_status: "pending" as const,
  monthly_status: "inactive" as const,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_product_id_reference: "prod_starter_live",
  stripe_price_id_deposit: "price_deposit_live_123",
  stripe_price_id_final_setup: "price_final_live_123",
  stripe_price_id_monthly: "price_monthly_live_123",
  payment_link_deposit: "https://buy.stripe.test/deposit-live",
  payment_link_final_setup: "https://buy.stripe.test/final-live",
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

let backgroundPayload: Record<string, unknown> | undefined;

vi.mock("@/lib/server/crm/db-context", async () => {
  const actual = await vi.importActual<any>("@/lib/server/crm/db-context");
  return {
    ...actual,
    withCrmContext: async (_context: unknown, run: (tx: any) => Promise<unknown>) => {
      const tx = {
        insert: vi.fn(() => ({
          values: (values: Record<string, unknown>) => ({
            returning: async () => [
              {
                id: "stripe-live-index-row-1",
                ...values,
                createdAt: new Date("2026-07-18T22:45:00.000Z")
              }
            ]
          })
        })),
        update: vi.fn(() => ({
          set: (values: Record<string, unknown>) => ({
            where: async () => {
              backgroundPayload = values.payload as Record<string, unknown>;
            }
          })
        }))
      };

      return run(tx);
    }
  };
});

const runIfLive = process.env.RUN_LIVE_REDWATCH_BRIDGE_TEST === "true" ? it : it.skip;

describe("starter Stripe flow -> live RedWatch bridge", () => {
  beforeEach(() => {
    vi.resetModules();
    backgroundPayload = undefined;
    constructEventMock.mockReset();
    retrieveSessionMock.mockReset();
    getByTenantIdMock.mockReset();
    findByStripeCustomerIdMock.mockReset();
    findCandidatesByPriceIdMock.mockReset();
    applyStripeUpdateMock.mockReset();

    getByTenantIdMock.mockReturnValue(state);
    findCandidatesByPriceIdMock.mockReturnValue([state]);
    applyStripeUpdateMock.mockImplementation((patch) => ({
      ...state,
      ...patch
    }));
  });

  runIfLive("records live RedWatch evidence for a starter deposit webhook path", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_live_proof_123"
        }
      }
    });

    retrieveSessionMock.mockResolvedValue({
      id: "cs_live_proof_123",
      customer: "cus_live_proof_123",
      subscription: null,
      metadata: {
        tenant_id: "tenant_starter_live_flow"
      },
      line_items: {
        data: [
          {
            price: {
              id: "price_deposit_live_123"
            }
          }
        ]
      }
    });

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const request = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "sig_live_proof"
      },
      body: JSON.stringify({ live: "proof" })
    });

    const response = await POST(request as any);
    expect(response.status).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    expect(applyStripeUpdateMock).toHaveBeenCalledWith({
      tenant_id: "tenant_starter_live_flow",
      stripe_customer_id: "cus_live_proof_123",
      stripe_subscription_id: null,
      deposit_status: "paid"
    });

    const evidenceId = (backgroundPayload as any)?.redwatch?.evidence_id;
    expect(evidenceId).toMatch(/^rw_/);

    console.log(`LIVE_STRIPE_FLOW_EVIDENCE_ID=${evidenceId}`);
  });
});
