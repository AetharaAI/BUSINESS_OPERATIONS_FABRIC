import { beforeEach, describe, expect, it, vi } from "vitest";

const voiceOpsRequestMock = vi.fn();

vi.mock("@/lib/server/voiceops-client", () => ({
  voiceOpsRequest: voiceOpsRequestMock
}));

describe("POST /api/session/forgot-password", () => {
  beforeEach(() => {
    voiceOpsRequestMock.mockReset();
  });

  it("forwards forgot-password requests without the platform-admin header", async () => {
    const { POST } = await import("@/app/api/session/forgot-password/route");
    const { NextRequest } = await import("next/server");

    voiceOpsRequestMock.mockResolvedValueOnce({});

    const request = new NextRequest("http://localhost/api/session/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: "cekectricg86@gmail.com" }),
      headers: { "content-type": "application/json" }
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      message: "If an account exists for that email, password reset instructions have been sent."
    });
    expect(voiceOpsRequestMock).toHaveBeenCalledWith({
      method: "POST",
      path: "/api/v1/auth/forgot-password",
      body: { email: "cekectricg86@gmail.com" }
    });
  });
});
