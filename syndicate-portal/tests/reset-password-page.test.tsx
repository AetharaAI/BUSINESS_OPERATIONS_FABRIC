import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResetPasswordClient from "@/app/reset-password/ResetPasswordClient";
import { PortalApiError, portalApi } from "@/lib/client/api";

let tokenValue = "";
const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: (name: string) => (name === "token" ? tokenValue : null) }),
  useRouter: () => ({ push: pushMock })
}));

describe("ResetPasswordClient", () => {
  beforeEach(() => {
    tokenValue = "";
    pushMock.mockReset();
    vi.restoreAllMocks();
  });

  it("shows token-missing state", () => {
    render(<ResetPasswordClient />);

    expect(screen.getByText(/Reset token missing/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reset password/i })).toBeDisabled();
  });

  it("shows invalid token error for 400", async () => {
    tokenValue = "bad-token";
    vi.spyOn(portalApi, "resetPassword").mockRejectedValue(new PortalApiError("bad token", 400));
    const user = userEvent.setup();

    render(<ResetPasswordClient />);

    await user.type(screen.getByLabelText("New password"), "new-password-123");
    await user.type(screen.getByLabelText("Confirm new password"), "new-password-123");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid or expired/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Request password reset/i)).toBeInTheDocument();
  });

  it("shows success state on reset", async () => {
    tokenValue = "good-token";
    vi.spyOn(portalApi, "resetPassword").mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(<ResetPasswordClient />);

    await user.type(screen.getByLabelText("New password"), "new-password-123");
    await user.type(screen.getByLabelText("Confirm new password"), "new-password-123");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText(/Password reset successful/i)).toBeInTheDocument();
    });
  });
});
