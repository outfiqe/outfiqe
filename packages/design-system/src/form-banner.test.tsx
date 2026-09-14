import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FormBanner } from "./form-banner";

describe("FormBanner", () => {
  it("renders its content as an alert", () => {
    render(<FormBanner>Something went wrong.</FormBanner>);

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong.");
  });

  it("renders no dismiss button when onDismiss is omitted", () => {
    render(<FormBanner>Something went wrong.</FormBanner>);

    expect(screen.queryByRole("button", { name: "Dismiss" })).not.toBeInTheDocument();
  });

  it("renders a dismiss button that calls onDismiss when clicked", () => {
    const onDismiss = vi.fn();
    render(<FormBanner onDismiss={onDismiss}>Something went wrong.</FormBanner>);

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
