import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CreatorStatus } from "@/features/auth/types";

import { CreatorStatusGate } from "./CreatorStatusGate";

vi.mock("./ApplyAsCreatorButton", () => ({
  ApplyAsCreatorButton: () => <button type="button">Apply to become a creator</button>,
}));

describe("CreatorStatusGate", () => {
  it("shows the under-review message for a pending application", () => {
    render(<CreatorStatusGate creatorStatus={CreatorStatus.PENDING} pitch="Earn commission." />);

    expect(screen.getByText("Application under review")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Apply to become a creator" }),
    ).not.toBeInTheDocument();
  });

  it("shows the become-a-creator pitch and apply button when the caller has never applied", () => {
    render(<CreatorStatusGate creatorStatus={CreatorStatus.NONE} pitch="Earn commission." />);

    expect(screen.getByText("Become a creator")).toBeInTheDocument();
    expect(screen.getByText("Earn commission.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply to become a creator" })).toBeInTheDocument();
  });

  it("adds a reapply note for a rejected application", () => {
    render(<CreatorStatusGate creatorStatus={CreatorStatus.REJECTED} pitch="Earn commission." />);

    expect(screen.getByText(/wasn't a fit/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply to become a creator" })).toBeInTheDocument();
  });
});
