import { describe, expect, it } from "vitest";

import { PLATFORM_SETTING_REGISTRY, readSettingValue } from "./platform-settings.registry.js";
import {
  describeAllowedRange,
  findBrokenSettingRule,
  settingValueSchema,
  toSettingValues,
  withSettingValue,
} from "./platform-settings.utils.js";

const STORED_AT = new Date("2026-09-29T00:00:00.000Z");
const { defaultValue: defaultItemsPerBoard, maximum: maxItemsPerBoard } =
  PLATFORM_SETTING_REGISTRY["outfit.maxItemsPerBoard"];

describe("readSettingValue", () => {
  it("falls back to the code default when nothing is stored", () => {
    expect(readSettingValue(new Map(), "outfit.maxItemsPerBoard")).toBe(defaultItemsPerBoard);
  });
});

describe("settingValueSchema", () => {
  it("accepts whole numbers inside the allowed range and rejects everything else", () => {
    const schema = settingValueSchema("outfit.maxItemsPerBoard");
    expect(schema.safeParse(maxItemsPerBoard).success).toBe(true);
    expect(schema.safeParse(maxItemsPerBoard + 1).success).toBe(false);
    expect(schema.safeParse(2.5).success).toBe(false);
    expect(schema.safeParse("7").success).toBe(false);
  });
});

describe("describeAllowedRange", () => {
  it("names the setting and its range in plain words", () => {
    expect(describeAllowedRange("outfit.maxEditorsPerBoard")).toBe(
      "Editors per board must be a whole number from 1 to 5.",
    );
  });
});

describe("toSettingValues", () => {
  it("keeps valid stored values and reports unknown or out-of-range rows as unusable", () => {
    const { values, unusableKeys } = toSettingValues([
      { key: "outfit.maxItemsPerBoard", value: 9, updatedAt: STORED_AT },
      { key: "outfit.maxEditorsPerBoard", value: 99, updatedAt: STORED_AT },
      { key: "outfit.retired", value: 1, updatedAt: STORED_AT },
    ]);

    expect(readSettingValue(values, "outfit.maxItemsPerBoard")).toBe(9);
    expect(values.has("outfit.maxEditorsPerBoard")).toBe(false);
    expect(unusableKeys).toEqual(["outfit.maxEditorsPerBoard", "outfit.retired"]);
  });
});

describe("withSettingValue", () => {
  it("returns a new set of values with one setting changed or cleared", () => {
    const original = new Map([["outfit.maxItemsPerBoard" as const, 9]]);

    const changed = withSettingValue(original, "outfit.minItemsToLock", 3);
    const cleared = withSettingValue(original, "outfit.maxItemsPerBoard", null);

    expect(readSettingValue(changed, "outfit.minItemsToLock")).toBe(3);
    expect(cleared.has("outfit.maxItemsPerBoard")).toBe(false);
    expect(original.get("outfit.maxItemsPerBoard")).toBe(9);
  });
});

describe("findBrokenSettingRule", () => {
  it("passes the defaults", () => {
    expect(findBrokenSettingRule(new Map())).toBeNull();
  });

  it("refuses a lock minimum above the board item limit", () => {
    const values = new Map([
      ["outfit.maxItemsPerBoard" as const, 3],
      ["outfit.minItemsToLock" as const, 4],
    ]);
    expect(findBrokenSettingRule(values)).toMatch(/Items needed to lock/);
  });

  it("refuses more photos per person than photos per board", () => {
    const values = new Map([["outfit.maxPhotosPerBoard" as const, 2]]);
    expect(findBrokenSettingRule(values)).toMatch(/Photos per person/);
  });
});
