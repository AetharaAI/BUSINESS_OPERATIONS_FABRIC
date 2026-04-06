import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardView } from "@/components/DashboardView";

describe("DashboardView", () => {
  it("renders TODO placeholders for future endpoints", () => {
    render(
      <DashboardView
        data={{
          mode: "enabled",
          effective_in_live_routing: false,
          recent_summaries: [],
          recent_escalations: [],
          completeness: {}
        }}
      />
    );

    expect(screen.getByText(/TODO\(team\)/i)).toBeInTheDocument();
    expect(screen.getByText(/TODO\(summaries\)/i)).toBeInTheDocument();
    expect(screen.getByText(/TODO\(escalation contacts\)/i)).toBeInTheDocument();
    expect(screen.getByText(/TODO\(call settings\)/i)).toBeInTheDocument();
  });
});
