import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentModePanel } from "@/components/AgentModePanel";

describe("AgentModePanel", () => {
  it("shows routing-enforcement warning when not live", () => {
    render(
      <AgentModePanel
        data={{
          mode: "enabled",
          effective_in_live_routing: false,
          changed_at: null,
          changed_by: null,
          fallback_destination: null
        }}
        canEdit
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText(/Routing enforcement pending/i)).toBeInTheDocument();
  });

  it("blocks controls for read-only users", () => {
    render(
      <AgentModePanel
        data={{
          mode: "bypass",
          effective_in_live_routing: true,
          changed_at: null,
          changed_by: null,
          fallback_destination: null
        }}
        canEdit={false}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save mode/i })).not.toBeInTheDocument();
  });

  it("submits update in editable mode", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <AgentModePanel
        data={{
          mode: "enabled",
          effective_in_live_routing: true,
          changed_at: null,
          changed_by: null,
          fallback_destination: null
        }}
        canEdit
        onSave={onSave}
      />
    );

    await user.selectOptions(screen.getByLabelText("Mode"), "bypass");
    await user.click(screen.getByRole("button", { name: /save mode/i }));
    expect(onSave).toHaveBeenCalledWith({ mode: "bypass", reason: undefined });
  });
});
