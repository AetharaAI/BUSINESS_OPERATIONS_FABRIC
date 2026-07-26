import { describe, expect, it, vi } from "vitest";

let backgroundPayload: Record<string, unknown> | undefined;

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

const runIfLive = process.env.RUN_LIVE_REDWATCH_BRIDGE_TEST === "true" ? it : it.skip;

describe("live RedWatch BOF bridge", () => {
  runIfLive("emits a BOF canonical event to live /v1/evidence and captures the bridge evidence id", async () => {
    vi.resetModules();
    backgroundPayload = undefined;

    const tx = {
      insert: vi.fn(() => ({
        values: (values: Record<string, unknown>) => ({
          returning: async () => [
            {
              id: "live-index-row-1",
              ...values,
              createdAt: new Date("2026-07-18T22:40:00.000Z")
            }
          ]
        })
      }))
    };

    const { emitWorkforceReceipt } = await import("@/lib/server/workforce/receipts");

    const receipt = await emitWorkforceReceipt({
      tx: tx as any,
      workspaceId: process.env.BOF_WORKSPACE_ID || "bof-live-proof-workspace",
      tenantId: process.env.BOF_TENANT_ID || "bof-live-proof-tenant",
      session: {
        user_id: "ops_live_bridge",
        email: "ops@aetherpro.us",
        role: "admin",
        is_platform_admin: true,
        is_internal_admin: true,
        subject: "subject:ops:live-bridge",
        handle: "ops-live-bridge",
        workforce_role: "internal_operator",
        capability_scope: ["tenant.onboarding.update_all"],
        tenant_scope_mode: "all",
        tenant_id: null,
        tenant_name: null,
        workspace_id: process.env.BOF_WORKSPACE_ID || null
      },
      actorType: "human",
      action: "workforce.bridge.live_proof",
      targetType: "onboarding_case",
      targetId: "live-proof-case",
      payload: {
        proof: "bof-live-redwatch-bridge",
        source: "vitest",
        date: "2026-07-18"
      }
    });

    expect((receipt.payload as any).redwatch.status).toBe("queued");

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const evidenceId = (backgroundPayload as any)?.redwatch?.evidence_id;
    expect(evidenceId).toMatch(/^rw_/);

    console.log(`LIVE_REDWATCH_EVIDENCE_ID=${evidenceId}`);
  });
});
