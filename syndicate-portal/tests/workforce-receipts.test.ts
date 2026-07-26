import { beforeEach, describe, expect, it, vi } from "vitest";

let backgroundPayload: Record<string, unknown> | undefined;

const makeTx = () => {
  const state: { values?: Record<string, unknown>; updatedPayload?: Record<string, unknown> } = {};
  return {
    state,
    tx: {
      insert: vi.fn(() => ({
        values: (values: Record<string, unknown>) => {
          state.values = values;
          return {
            returning: async () => [
              {
                id: "index-row-1",
                ...values,
                createdAt: new Date("2026-07-18T05:00:00Z")
              }
            ]
          };
        }
      })),
      update: vi.fn(() => ({
        set: (values: Record<string, unknown>) => ({
          where: async () => {
            state.updatedPayload = values.payload as Record<string, unknown>;
          }
        })
      }))
    }
  };
};

vi.mock("@/lib/server/crm/db-context", async () => {
  const actual = await vi.importActual<any>("@/lib/server/crm/db-context");
  return {
    ...actual,
    withCrmContext: async (_context: unknown, run: (tx: any) => Promise<unknown>) => {
      const tx = {
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

describe("workforce receipt adapter", () => {
  beforeEach(() => {
    vi.resetModules();
    backgroundPayload = undefined;
    process.env.REDWATCH_CLIENT_MODE = "memory";
  });

  it("queues bridge metadata and avoids BOF-side receipt chain fields", async () => {
    const { emitWorkforceReceipt } = await import("@/lib/server/workforce/receipts");
    const { tx, state } = makeTx();

    const receipt = await emitWorkforceReceipt({
      tx: tx as any,
      workspaceId: "6b089a98-9735-4ee5-b3bf-b1d76cd36fc0",
      tenantId: "6363221b-3bc2-47f0-8c25-43288b545363",
      session: {
        user_id: "user_123",
        email: "ops@syndicateai.co",
        role: "admin",
        is_platform_admin: true,
        is_internal_admin: true,
        subject: "subject:ops",
        handle: "ops",
        workforce_role: "internal_operator",
        capability_scope: ["tenant.onboarding.update_all"],
        tenant_scope_mode: "all",
        tenant_id: null,
        tenant_name: null
      },
      actorType: "human",
      action: "workforce.invited",
      targetType: "onboarding_case",
      targetId: "case_123",
      payload: {
        person_id: "person_123",
        invite_email: "ops@syndicateai.co"
      }
    });

    expect(receipt.payload).toMatchObject({
      person_id: "person_123",
      invite_email: "ops@syndicateai.co",
      redwatch: {
        canonical_event_type: "workforce.invited",
        status: "queued",
        evidence_id: null
      }
    });
    expect((receipt.payload as any).redwatch.chain_id).toBeUndefined();
    expect((receipt.payload as any).redwatch.receipt_id).toBeUndefined();
    expect((state.values?.payload as any).redwatch.chain_id).toBeUndefined();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect((backgroundPayload as any)?.redwatch?.evidence_id).toBeDefined();
  });
});
