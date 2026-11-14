import { describe, expect, it } from "vitest";

import {
  EXPLORE_GRID_HANDHELD_COLUMN_COUNT,
  EXPLORE_GRID_WIDE_SCREEN_COLUMN_COUNT,
} from "../../constants/explore.constants";
import { pickInitialExploreGridColumnCount } from "./initialGridColumnCount";

describe("pickInitialExploreGridColumnCount", () => {
  it("starts phones and tablets on the handheld column count", () => {
    expect(pickInitialExploreGridColumnCount("mobile")).toBe(EXPLORE_GRID_HANDHELD_COLUMN_COUNT);
    expect(pickInitialExploreGridColumnCount("tablet")).toBe(EXPLORE_GRID_HANDHELD_COLUMN_COUNT);
  });

  it("starts desktops and unknown browsers on the wide-screen column count", () => {
    expect(pickInitialExploreGridColumnCount(undefined)).toBe(
      EXPLORE_GRID_WIDE_SCREEN_COLUMN_COUNT,
    );
    expect(pickInitialExploreGridColumnCount("smarttv")).toBe(
      EXPLORE_GRID_WIDE_SCREEN_COLUMN_COUNT,
    );
  });
});
