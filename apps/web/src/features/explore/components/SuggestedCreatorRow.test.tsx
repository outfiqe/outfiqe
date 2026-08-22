import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { SuggestedCreator } from "../api/exploreFeedSchemas";
import { SuggestedCreatorRow, SuggestedCreatorRowSkeleton } from "./SuggestedCreatorRow";

const buildCreator = (overrides: Partial<SuggestedCreator> = {}): SuggestedCreator => ({
  id: "creator-1",
  name: "Priya Shah",
  handle: "priya-shah",
  isCreator: true,
  creatorStatus: "APPROVED",
  followerCount: 1234,
  ...overrides,
});

describe("SuggestedCreatorRow", () => {
  it("renders the creator's name, handle link, and formatted follower count", () => {
    render(<SuggestedCreatorRow creator={buildCreator()} onFollow={vi.fn()} />);

    expect(screen.getByText("Priya Shah")).toBeInTheDocument();
    expect(screen.getByText("1,234 followers")).toBeInTheDocument();
    expect(screen.getAllByRole("link")[0]).toHaveAttribute("href", "/creator/priya-shah");
  });

  it("calls onFollow with the creator's id when the Follow button is clicked", async () => {
    const user = userEvent.setup();
    const onFollow = vi.fn();
    render(
      <SuggestedCreatorRow creator={buildCreator({ id: "creator-42" })} onFollow={onFollow} />,
    );

    await user.click(screen.getByRole("button", { name: "Follow" }));

    expect(onFollow).toHaveBeenCalledWith("creator-42");
  });
});

describe("SuggestedCreatorRowSkeleton", () => {
  it("renders without a name or follow button", () => {
    render(<SuggestedCreatorRowSkeleton />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
