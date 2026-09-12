import { type ReactNode, useState } from "react";

export type KanbanColumn = {
  id: string;
  title: string;
  accentClassName?: string;
};

export type KanbanCard = {
  id: string;
  columnId: string;
};

export type KanbanBoardProps<TCard extends KanbanCard> = {
  columns: KanbanColumn[];
  cards: TCard[];
  renderCard: (card: TCard) => ReactNode;
  onCardMove: (cardId: string, toColumnId: string) => void;
  emptyColumnLabel?: string;
  disabled?: boolean;
};

export const KanbanBoard = <TCard extends KanbanCard>({
  columns,
  cards,
  renderCard,
  onCardMove,
  emptyColumnLabel = "No cards",
  disabled = false,
}: KanbanBoardProps<TCard>) => {
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  const cardsByColumn = new Map<string, TCard[]>(columns.map((column) => [column.id, []]));
  for (const card of cards) {
    cardsByColumn.get(card.columnId)?.push(card);
  }

  const moveCard = (cardId: string, toColumnId: string) => {
    if (disabled) return;
    const card = cards.find((candidate) => candidate.id === cardId);
    if (card && card.columnId !== toColumnId) onCardMove(cardId, toColumnId);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {columns.map((column) => {
        const columnCards = cardsByColumn.get(column.id) ?? [];
        return (
          <section
            key={column.id}
            aria-label={column.title}
            onDragOver={(event) => {
              if (disabled) return;
              event.preventDefault();
              setDragOverColumnId(column.id);
            }}
            onDragLeave={() =>
              setDragOverColumnId((current) => (current === column.id ? null : current))
            }
            onDrop={(event) => {
              event.preventDefault();
              if (draggingCardId) moveCard(draggingCardId, column.id);
              setDraggingCardId(null);
              setDragOverColumnId(null);
            }}
            className={[
              "flex w-72 shrink-0 flex-col rounded-xl border bg-card p-3 transition-colors",
              dragOverColumnId === column.id ? "border-foreground" : "border-border",
            ].join(" ")}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3
                className={[
                  "text-sm font-semibold",
                  column.accentClassName ?? "text-foreground",
                ].join(" ")}
              >
                {column.title}
              </h3>
              <span className="text-xs text-muted-foreground">{columnCards.length}</span>
            </div>

            <div className="flex flex-col gap-2">
              {columnCards.length === 0 && (
                <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                  {emptyColumnLabel}
                </p>
              )}

              {columnCards.map((card) => (
                <article
                  key={card.id}
                  draggable={!disabled}
                  onDragStart={() => !disabled && setDraggingCardId(card.id)}
                  onDragEnd={() => {
                    setDraggingCardId(null);
                    setDragOverColumnId(null);
                  }}
                  className={[
                    "rounded-lg border border-border bg-background p-3 text-sm shadow-sm",
                    disabled ? "cursor-default" : "cursor-grab",
                    draggingCardId === card.id ? "opacity-50" : "",
                  ].join(" ")}
                >
                  {renderCard(card)}

                  <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    Move to
                    <select
                      value={card.columnId}
                      disabled={disabled}
                      onChange={(event) => moveCard(card.id, event.target.value)}
                      className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {columns.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};
