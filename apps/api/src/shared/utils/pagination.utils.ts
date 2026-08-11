export type CursorPageParams = {
  cursor?: string;
  limit: number;
};

export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};

/**
 * Trims a keyset-paginated result (fetched with `take: limit + 1`) back down to
 * `limit` rows and derives the next cursor from the last remaining row.
 *
 * Every cursor-paginated repository/service in this codebase over-fetches by one
 * row to detect "is there another page", then repeats this same slice + cursor
 * derivation. Centralizing it keeps that logic in one place instead of re-implemented
 * per module.
 */
export const buildCursorPage = <T>(
  rows: T[],
  limit: number,
  getCursor: (row: T) => string,
): CursorPage<T> => {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  return { items, nextCursor: hasMore && last ? getCursor(last) : null };
};
