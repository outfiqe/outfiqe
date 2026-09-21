import { describe, expect, it } from "vitest";

import { conditionsSchema, conditionValueErrorKey } from "./conditionForm.schema";

const condition = (value: string) => ({ metric: "total_likes", operator: "gte", value });

describe("conditionsSchema", () => {
  it("accepts whole, decimal and negative numbers", () => {
    expect(
      conditionsSchema.safeParse([condition("10"), condition("2.5"), condition("-3")]).success,
    ).toBe(true);
  });

  it("asks for a value and rejects text", () => {
    const blank = conditionsSchema.safeParse([condition("")]);
    const text = conditionsSchema.safeParse([condition("abc")]);
    expect(blank.success ? [] : blank.error.issues[0]?.message).toBe("Enter a value.");
    expect(text.success ? [] : text.error.issues[0]?.message).toBe(
      "Use a number such as 10 or 2.5.",
    );
  });

  it("requires at least one condition", () => {
    const empty = conditionsSchema.safeParse([]);
    expect(empty.success ? [] : empty.error.issues[0]?.message).toBe("Add at least one condition.");
  });

  it("builds the error key for a row", () => {
    expect(conditionValueErrorKey(2)).toBe("conditions.2.value");
  });
});
