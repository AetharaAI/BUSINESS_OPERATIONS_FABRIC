import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ForgotPasswordPage from "@/app/forgot-password/page";
import { portalApi } from "@/lib/client/api";

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows neutral success state after submit", async () => {
    const forgotSpy = vi.spyOn(portalApi, "forgotPassword").mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText("Email"), "owner@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/If an account exists for that email/i)).toBeInTheDocument();
    });

    expect(forgotSpy).toHaveBeenCalledWith({ email: "owner@example.com" });
  });
});
