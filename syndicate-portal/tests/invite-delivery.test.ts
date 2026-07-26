import { beforeEach, describe, expect, it, vi } from "vitest";

const voiceOpsRequestMock = vi.fn();

vi.mock("@/lib/server/voiceops-client", () => ({
  voiceOpsRequest: voiceOpsRequestMock
}));

describe("dispatchWorkforceInvite", () => {
  beforeEach(() => {
    voiceOpsRequestMock.mockReset();
    vi.resetModules();
  });

  it("uses email delivery without the platform-admin header by default", async () => {
    process.env.PORTAL_PUBLIC_BASE_URL = "https://voice.syndicateai.co";
    process.env.WORKFORCE_INVITE_DELIVERY_MODE = "email";
    process.env.VOICEOPS_PLATFORM_ADMIN_KEY = "temp_admin_voiceops_key_2026";

    voiceOpsRequestMock.mockResolvedValueOnce({});

    const { dispatchWorkforceInvite } = await import("@/lib/server/workforce/invite-delivery");
    const result = await dispatchWorkforceInvite("cekectricg86@gmail.com", undefined, { onboardingCaseId: "case-123" });

    expect(result).toEqual({
      delivery_mode: "email",
      invite_url: null,
      status: "email_sent"
    });
    expect(voiceOpsRequestMock).toHaveBeenCalledTimes(1);
    expect(voiceOpsRequestMock).toHaveBeenCalledWith({
      method: "POST",
      path: "/api/v1/auth/forgot-password",
      headers: { "x-workforce-case-id": "case-123" },
      body: { email: "cekectricg86@gmail.com" }
    });
  });

  it("can request both email delivery and a direct link for operator preview flows", async () => {
    process.env.PORTAL_PUBLIC_BASE_URL = "https://voice.syndicateai.co";
    process.env.WORKFORCE_INVITE_DELIVERY_MODE = "both";
    process.env.VOICEOPS_PLATFORM_ADMIN_KEY = "temp_admin_voiceops_key_2026";

    voiceOpsRequestMock
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ reset_token: "fresh-token" });

    const { dispatchWorkforceInvite } = await import("@/lib/server/workforce/invite-delivery");
    const result = await dispatchWorkforceInvite("cekectricg86@gmail.com", undefined, { onboardingCaseId: "case-123" });

    expect(result).toEqual({
      delivery_mode: "both",
      invite_url: "https://voice.syndicateai.co/reset-password?token=fresh-token",
      status: "email_sent_and_direct_link_ready"
    });
    expect(voiceOpsRequestMock).toHaveBeenNthCalledWith(1, {
      method: "POST",
      path: "/api/v1/auth/forgot-password",
      headers: { "x-workforce-case-id": "case-123" },
      body: { email: "cekectricg86@gmail.com" }
    });
    expect(voiceOpsRequestMock).toHaveBeenNthCalledWith(2, {
      method: "POST",
      path: "/api/v1/auth/forgot-password",
      headers: {
        "x-platform-admin-key": "temp_admin_voiceops_key_2026",
        "x-workforce-case-id": "case-123"
      },
      body: { email: "cekectricg86@gmail.com" }
    });
  });
});
