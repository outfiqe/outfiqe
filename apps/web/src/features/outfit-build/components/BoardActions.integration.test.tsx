import { createTranslatedQueryWrapper } from "@test/integration/translationsWrapper";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { OutfitBoard } from "../api/outfitSchemas";
import { buildBoard, RAM } from "../testing/outfitFixtures";
import { BoardActions } from "./BoardActions";

const CREDIT_NOTE = /Your name will also come off this build/;

const renderActions = (board: OutfitBoard, onLeave = vi.fn()) => {
  const { Wrapper } = createTranslatedQueryWrapper();
  render(
    <BoardActions
      board={board}
      currentUserId={RAM.id}
      isSaving={false}
      onToggleHappy={vi.fn()}
      onLock={vi.fn()}
      onUnlock={vi.fn()}
      onArchive={vi.fn()}
      onLeave={onLeave}
      onOpenSettings={vi.fn()}
      onOpenVisibility={vi.fn()}
    />,
    { wrapper: Wrapper },
  );
  return { onLeave };
};

describe("BoardActions leaving", () => {
  it("asks before leaving and explains what happens to your credit on a locked build", async () => {
    const { onLeave } = renderActions(
      buildBoard({ myRole: "EDITOR", status: "LOCKED", lastLockedVersion: 3 }),
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Leave build" }));

    expect(screen.getByText("Leave this build?")).toBeInTheDocument();
    expect(screen.getByText(CREDIT_NOTE)).toBeInTheDocument();
    expect(onLeave).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Yes, leave" }));

    expect(onLeave).toHaveBeenCalledOnce();
  });

  it("skips the credit note on a build that was never locked, and lets you stay", async () => {
    const { onLeave } = renderActions(buildBoard({ myRole: "EDITOR" }));
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Leave build" }));
    expect(screen.queryByText(CREDIT_NOTE)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Stay" }));

    expect(screen.queryByText("Leave this build?")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Leave build" })).toBeInTheDocument();
    expect(onLeave).not.toHaveBeenCalled();
  });
});
