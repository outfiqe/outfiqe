import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatCard } from "./stat-card";

describe("StatCard", () => {
  it("renders the label and value", () => {
    render(<StatCard label="Total earnings" value="Rs 12,400" />);

    expect(screen.getByText("Total earnings")).toBeInTheDocument();
    expect(screen.getByText("Rs 12,400")).toBeInTheDocument();
  });

  it("renders a positive delta with the success tone", () => {
    render(
      <StatCard
        label="Followers"
        value={128}
        delta={{ value: "+12%", tone: "positive", label: "vs last 30 days" }}
      />,
    );

    const delta = screen.getByText("+12%");
    expect(delta).toHaveClass("text-success");
    expect(screen.getByText("vs last 30 days")).toBeInTheDocument();
  });

  it("renders the icon when provided", () => {
    const Icon = ({ className }: { className?: string }) => (
      <svg data-testid="stat-icon" className={className} />
    );
    render(<StatCard label="Looks" value={4} icon={Icon} />);

    expect(screen.getByTestId("stat-icon")).toBeInTheDocument();
  });
});
