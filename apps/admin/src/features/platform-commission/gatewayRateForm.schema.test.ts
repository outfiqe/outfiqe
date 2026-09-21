import { describe, expect, it } from "vitest";

import { gatewayRateFormSchema } from "./gatewayRateForm.schema";

const messageFor = (ratePercent: string) => {
  const result = gatewayRateFormSchema.safeParse({ ratePercent });
  return result.success ? undefined : result.error.issues[0]?.message;
};

describe("gatewayRateFormSchema", () => {
  it("accepts whole and decimal rates, including zero", () => {
    expect(messageFor("0")).toBeUndefined();
    expect(messageFor("3")).toBeUndefined();
    expect(messageFor("2.5")).toBeUndefined();
  });

  it("asks for a rate and rejects negatives, text and numbers over 100", () => {
    expect(messageFor("")).toBe("Enter a rate.");
    expect(messageFor("-1")).toBe("Use a number such as 2.5, with no minus sign.");
    expect(messageFor("abc")).toBe("Use a number such as 2.5, with no minus sign.");
    expect(messageFor("101")).toBe("Use a number up to 100.");
  });
});
