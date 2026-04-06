import { describe, expect, it } from "vitest";
import { createInviteToken, parseInviteToken } from "@/lib/server/invite-tokens";

describe("invite tokens", () => {
  it("creates and parses signed invite tokens", () => {
    process.env.PORTAL_INVITE_TOKEN_SECRET = "test-secret";

    const token = createInviteToken({
      email: "owner@blues-electric.com",
      tenant_id: "tenant_123",
      role: "owner",
      temp_password: "temp#pass",
      expires_at: new Date(Date.now() + 30_000).toISOString()
    });

    const parsed = parseInviteToken(token);
    expect(parsed.email).toBe("owner@blues-electric.com");
    expect(parsed.tenant_id).toBe("tenant_123");
    expect(parsed.role).toBe("owner");
  });
});
