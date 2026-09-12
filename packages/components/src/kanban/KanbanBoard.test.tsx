import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { KanbanBoard, type KanbanCard } from "./KanbanBoard";

type TestCard = KanbanCard & { title: string };

const COLUMNS = [
  { id: "col-a", title: "Column A" },
  { id: "col-b", title: "Column B" },
];

const CARDS: TestCard[] = [{ id: "card-1", columnId: "col-a", title: "First card" }];

describe("KanbanBoard", () => {
  it("moves a card between columns through its own select control", async () => {
    const onCardMove = vi.fn();
    render(
      <KanbanBoard
        columns={COLUMNS}
        cards={CARDS}
        onCardMove={onCardMove}
        renderCard={(card) => card.title}
      />,
    );

    const user = userEvent.setup({ delay: null });
    await user.selectOptions(screen.getByLabelText("Move to"), "col-b");

    expect(onCardMove).toHaveBeenCalledWith("card-1", "col-b");
  });

  it("disables dragging and the move-to control when disabled, and drops nothing through it", async () => {
    const onCardMove = vi.fn();
    render(
      <KanbanBoard
        columns={COLUMNS}
        cards={CARDS}
        onCardMove={onCardMove}
        renderCard={(card) => card.title}
        disabled
      />,
    );

    const card = screen.getByText("First card").closest("article") as HTMLElement;
    expect(card).toHaveAttribute("draggable", "false");

    const moveToSelect = screen.getByLabelText("Move to");
    expect(moveToSelect).toBeDisabled();

    const columnB = screen.getByRole("region", { name: "Column B" });
    columnB.dispatchEvent(new Event("drop", { bubbles: true, cancelable: true }));

    expect(onCardMove).not.toHaveBeenCalled();
  });
});
