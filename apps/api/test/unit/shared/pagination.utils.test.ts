import { describe, expect, it } from "vitest";

import { buildCursorPage, decodeCursor, encodeCursor } from "#lib/pagination.utils.js";

describe("buildCursorPage", () => {
  it("returns all rows with no next cursor when under the limit", () => {
    const rows = [{ id: "a" }, { id: "b" }];

    const page = buildCursorPage(rows, 5, (row) => row.id);

    expect(page.items).toEqual(rows);
    expect(page.nextCursor).toBeNull();
  });

  it("trims the over-fetched row and derives the next cursor from the last remaining row", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];

    const page = buildCursorPage(rows, 2, (row) => row.id);

    expect(page.items).toEqual([{ id: "a" }, { id: "b" }]);
    expect(page.nextCursor).toBe("b");
  });

  it("returns an empty page with no next cursor for no rows", () => {
    const page = buildCursorPage<{ id: string }>([], 5, (row) => row.id);

    expect(page.items).toEqual([]);
    expect(page.nextCursor).toBeNull();
  });

  it("returns no next cursor when rows exactly fill the limit", () => {
    const rows = [{ id: "a" }, { id: "b" }];

    const page = buildCursorPage(rows, 2, (row) => row.id);

    expect(page.items).toEqual(rows);
    expect(page.nextCursor).toBeNull();
  });
});

describe("encodeCursor / decodeCursor", () => {
  it("round-trips an arbitrary payload", () => {
    const payload = { id: "abc-123", createdAt: "2026-01-01" };

    const cursor = encodeCursor(payload);

    expect(decodeCursor<typeof payload>(cursor)).toEqual(payload);
  });

  it("returns undefined for an undefined cursor", () => {
    expect(decodeCursor(undefined)).toBeUndefined();
  });

  it("returns undefined for a malformed cursor instead of throwing", () => {
    expect(decodeCursor("not-valid-base64url-json")).toBeUndefined();
  });
});
