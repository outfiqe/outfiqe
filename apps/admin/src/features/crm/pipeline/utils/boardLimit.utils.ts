export const BOARD_DEALS_PER_STAGE = 100;

export const isAnyColumnFull = (cards: { columnId: string }[]): boolean => {
  const cardCountByColumn = new Map<string, number>();
  for (const { columnId } of cards) {
    cardCountByColumn.set(columnId, (cardCountByColumn.get(columnId) ?? 0) + 1);
  }
  return [...cardCountByColumn.values()].some((cardCount) => cardCount >= BOARD_DEALS_PER_STAGE);
};
