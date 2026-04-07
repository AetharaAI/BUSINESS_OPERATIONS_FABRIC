import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardView } from "@/components/DashboardView";

describe("DashboardView", () => {
  it("renders account overview statuses and quick actions", () => {
    render(
      <DashboardView
        dashboard={{
          mode: "enabled",
          effective_in_live_routing: false,
          recent_summaries: [],
          recent_escalations: [],
          completeness: {}
        }}
        billing={null}
      />
    );

    expect(screen.getByRole("heading", { name: /account overview/i })).toBeInTheDocument();
    expect(screen.getByText(/quick actions/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view billing/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /review signed documents/i })).toBeInTheDocument();
  });
});
