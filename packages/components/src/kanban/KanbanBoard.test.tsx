import { fireEvent, render, screen } from "@testing-library/react";
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

  it("highlights the column being dragged over and suppresses the browser default", () => {
    render(
      <KanbanBoard
        columns={COLUMNS}
        cards={CARDS}
        onCardMove={vi.fn()}
        renderCard={(card) => card.title}
      />,
    );

    const columnA = screen.getByRole("region", { name: "Column A" });
    expect(columnA.className).not.toContain("border-foreground");

    const wasNotPrevented = fireEvent.dragOver(columnA);

    expect(wasNotPrevented).toBe(false);
    expect(columnA.className).toContain("border-foreground");
  });

  it("does not suppress the browser default or highlight the column when disabled", () => {
    render(
      <KanbanBoard
        columns={COLUMNS}
        cards={CARDS}
        onCardMove={vi.fn()}
        renderCard={(card) => card.title}
        disabled
      />,
    );

    const columnA = screen.getByRole("region", { name: "Column A" });
    const wasNotPrevented = fireEvent.dragOver(columnA);

    expect(wasNotPrevented).toBe(true);
    expect(columnA.className).not.toContain("border-foreground");
  });

  it("clears the drag-over highlight once the drag leaves the column", () => {
    render(
      <KanbanBoard
        columns={COLUMNS}
        cards={CARDS}
        onCardMove={vi.fn()}
        renderCard={(card) => card.title}
      />,
    );

    const columnA = screen.getByRole("region", { name: "Column A" });
    fireEvent.dragOver(columnA);
    expect(columnA.className).toContain("border-foreground");

    fireEvent.dragLeave(columnA);
    expect(columnA.className).not.toContain("border-foreground");
  });

  it("fades a card while it is being dragged and clears both drag states on drag end", () => {
    render(
      <KanbanBoard
        columns={COLUMNS}
        cards={CARDS}
        onCardMove={vi.fn()}
        renderCard={(card) => card.title}
      />,
    );

    const card = screen.getByText("First card").closest("article") as HTMLElement;
    const columnA = screen.getByRole("region", { name: "Column A" });

    fireEvent.dragStart(card);
    expect(card.className).toContain("opacity-50");

    fireEvent.dragOver(columnA);
    expect(columnA.className).toContain("border-foreground");

    fireEvent.dragEnd(card);
    expect(card.className).not.toContain("opacity-50");
    expect(columnA.className).not.toContain("border-foreground");
  });
});
