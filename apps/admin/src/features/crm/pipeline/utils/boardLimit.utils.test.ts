import { describe, expect, it } from "vitest";

import { BOARD_DEALS_PER_STAGE, isAnyColumnFull } from "./boardLimit.utils";

const cardsIn = (columnId: string, cardCount: number) =>
  Array.from({ length: cardCount }, () => ({ columnId }));

describe("isAnyColumnFull", () => {
  it("is false for an empty board", () => {
    expect(isAnyColumnFull([])).toBe(false);
  });

  it("is false while every column is under the limit", () => {
    expect(
      isAnyColumnFull([
        ...cardsIn("lead", BOARD_DEALS_PER_STAGE - 1),
        ...cardsIn("won", BOARD_DEALS_PER_STAGE - 1),
      ]),
    ).toBe(false);
  });

  it("is true once one column reaches the limit", () => {
    expect(isAnyColumnFull(cardsIn("lead", BOARD_DEALS_PER_STAGE))).toBe(true);
  });
});
