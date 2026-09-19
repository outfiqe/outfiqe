import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatCard, StatCardSkeleton } from "./stat-card";

describe("StatCardSkeleton", () => {
  it("uses the same card wrapper as StatCard so the loaded card does not shift the layout", () => {
    const { container: loadedContainer } = render(<StatCard label="Products" value={14} />);
    const { container: skeletonContainer } = render(<StatCardSkeleton />);

    expect(skeletonContainer.firstElementChild?.className).toBe(
      loadedContainer.firstElementChild?.className,
    );
  });

  it("adds a delta line only when asked to", () => {
    const { container: withoutDelta } = render(<StatCardSkeleton />);
    const { container: withDelta } = render(<StatCardSkeleton hasDelta />);

    expect(withDelta.firstElementChild?.children.length).toBe(
      (withoutDelta.firstElementChild?.children.length ?? 0) + 1,
    );
  });
});

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

  it("reveals the hint text from a labelled trigger when hint is provided", async () => {
    render(
      <StatCard
        label="Pending payout"
        value="Rs 4,252"
        hint="Earnings from recent sales that are still maturing."
      />,
    );

    const trigger = screen.getByRole("button", { name: "How Pending payout is calculated" });
    fireEvent.focus(trigger);

    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Earnings from recent sales that are still maturing.",
    );
  });

  it("renders no hint trigger when hint is omitted", () => {
    render(<StatCard label="Products" value={14} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
