import { describe, expect, it } from "vitest";

import { optionalWholeNumberText, percentText, wholeNumberText } from "./formFields";

const messageFor = (
  schema: {
    safeParse: (value: string) => { success: boolean; error?: { issues: { message: string }[] } };
  },
  value: string,
) => {
  const result = schema.safeParse(value);
  return result.success ? undefined : result.error?.issues[0]?.message;
};

describe("wholeNumberText", () => {
  const schema = wholeNumberText("a delivery fee", { max: 1000 });

  it("accepts whole numbers including zero", () => {
    expect(messageFor(schema, "0")).toBeUndefined();
    expect(messageFor(schema, "250")).toBeUndefined();
  });

  it("asks for a value when empty", () => {
    expect(messageFor(schema, "  ")).toBe("Enter a delivery fee.");
  });

  it("rejects decimals, negatives and text", () => {
    const expected = "Use a whole number with no decimals or minus sign.";
    expect(messageFor(schema, "1.5")).toBe(expected);
    expect(messageFor(schema, "-3")).toBe(expected);
    expect(messageFor(schema, "abc")).toBe(expected);
  });

  it("rejects a number above the maximum", () => {
    expect(messageFor(schema, "1001")).toBe("Use a number up to 1,000.");
  });
});

describe("optionalWholeNumberText", () => {
  it("accepts empty or a whole number, and rejects anything else", () => {
    const schema = optionalWholeNumberText();

    expect(messageFor(schema, "")).toBeUndefined();
    expect(messageFor(schema, "12")).toBeUndefined();
    expect(messageFor(schema, "1.2")).toBe("Use a whole number with no decimals or minus sign.");
  });
});

describe("percentText", () => {
  const schema = percentText("a rate", { max: 100 });

  it("accepts whole and decimal percentages up to the maximum", () => {
    expect(messageFor(schema, "2.5")).toBeUndefined();
    expect(messageFor(schema, "100")).toBeUndefined();
  });

  it("asks for a value and rejects negatives, text and numbers over the maximum", () => {
    expect(messageFor(schema, "")).toBe("Enter a rate.");
    expect(messageFor(schema, "-1")).toBe("Use a number such as 2.5, with no minus sign.");
    expect(messageFor(schema, "101")).toBe("Use a number up to 100.");
  });
});
