import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChangePasswordPage from "@/app/change-password/page";
import { PortalApiError, portalApi } from "@/lib/client/api";

vi.mock("@/components/PortalNav", () => ({
  PortalNav: () => <div>PortalNav</div>
}));

describe("ChangePasswordPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows success after password change", async () => {
    vi.spyOn(portalApi, "changePassword").mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(<ChangePasswordPage />);

    await user.type(screen.getByLabelText("Current password"), "old-pass");
    await user.type(screen.getByLabelText("New password"), "new-password-123");
    await user.type(screen.getByLabelText("Confirm new password"), "new-password-123");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(screen.getByText(/Password changed successfully/i)).toBeInTheDocument();
    });
  });

  it("shows incorrect current password error", async () => {
    vi.spyOn(portalApi, "changePassword").mockRejectedValue(new PortalApiError("bad current", 401));
    const user = userEvent.setup();

    render(<ChangePasswordPage />);

    await user.type(screen.getByLabelText("Current password"), "wrong-pass");
    await user.type(screen.getByLabelText("New password"), "new-password-123");
    await user.type(screen.getByLabelText("Confirm new password"), "new-password-123");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(screen.getByText(/Current password is incorrect/i)).toBeInTheDocument();
    });
  });
});
