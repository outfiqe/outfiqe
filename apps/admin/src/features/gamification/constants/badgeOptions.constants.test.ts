import { describe, expect, it } from "vitest";

import {
  badgeCategorySchema,
  badgeRaritySchema,
  badgeShapeSchema,
} from "../api/gamificationSchemas";
import { CATEGORY_OPTIONS, RARITY_OPTIONS, SHAPE_OPTIONS } from "./badgeOptions.constants";

const sorted = (values: readonly string[]) => [...values].sort();

describe("badge option lists stay in sync with their schemas", () => {
  it("offers exactly the shapes the schema accepts", () => {
    expect(sorted(SHAPE_OPTIONS)).toEqual(sorted(badgeShapeSchema.options));
  });

  it("offers exactly the rarities the schema accepts", () => {
    expect(sorted(RARITY_OPTIONS)).toEqual(sorted(badgeRaritySchema.options));
  });

  it("offers exactly the categories the schema accepts", () => {
    expect(sorted(CATEGORY_OPTIONS)).toEqual(sorted(badgeCategorySchema.options));
  });
});
