import { describe, expect, it, vi, beforeEach } from "vitest";
import { portalApi, PortalApiError } from "@/lib/client/api";

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe("portalApi", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("logs in with POST body", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true })
    });

    const response = await portalApi.login("owner@example.com", "secret");
    expect(response.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/session/login",
      expect.objectContaining({
        method: "POST",
        credentials: "include"
      })
    );
  });

  it("surfaces API error payloads", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: "forbidden" })
    });

    await expect(portalApi.dashboard()).rejects.toBeInstanceOf(PortalApiError);
  });

  it("parses typed agent mode response", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        mode: "bypass",
        effective_in_live_routing: false
      })
    });

    const mode = await portalApi.agentMode();
    expect(mode.mode).toBe("bypass");
    expect(mode.effective_in_live_routing).toBe(false);
  });
});
