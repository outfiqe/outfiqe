import { KanbanBoard } from "@outfiqe/components";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

type Card = { id: string; columnId: string; label: string };

const columns = [
  { id: "lead", title: "Lead" },
  { id: "won", title: "Won" },
];

const cards: Card[] = [{ id: "d-1", columnId: "lead", label: "Spring collab" }];

describe("KanbanBoard", () => {
  it("renders columns with their card counts and an empty-column label", () => {
    render(
      <KanbanBoard
        columns={columns}
        cards={cards}
        renderCard={(card) => <span>{card.label}</span>}
        onCardMove={vi.fn()}
        emptyColumnLabel="No deals"
      />,
    );

    expect(screen.getByRole("region", { name: "Lead" })).toBeInTheDocument();
    expect(screen.getByText("Spring collab")).toBeInTheDocument();
    expect(screen.getByText("No deals")).toBeInTheDocument();
  });

  it("moves a card via the keyboard-accessible Move to select", async () => {
    const onCardMove = vi.fn();
    render(
      <KanbanBoard
        columns={columns}
        cards={cards}
        renderCard={(card) => <span>{card.label}</span>}
        onCardMove={onCardMove}
      />,
    );

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Move to"), "won");

    expect(onCardMove).toHaveBeenCalledWith("d-1", "won");
  });
});
