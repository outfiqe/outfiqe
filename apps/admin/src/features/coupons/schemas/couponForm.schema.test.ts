import { toDateInputValue } from "@outfiqe/utils";
import { describe, expect, it } from "vitest";

import { couponFormSchema, EMPTY_COUPON_FORM } from "./couponForm.schema";

const YESTERDAY_MS = 24 * 60 * 60 * 1000;

const parseWithEndDate = (endsAt: string) =>
  couponFormSchema.safeParse({ ...EMPTY_COUPON_FORM, code: "SAVE20", endsAt });

describe("couponFormSchema end date", () => {
  it("accepts no end date and an end date of today", () => {
    expect(parseWithEndDate("").success).toBe(true);
    expect(parseWithEndDate(toDateInputValue()).success).toBe(true);
  });

  it("rejects an end date in the past with a plain message", () => {
    const yesterday = toDateInputValue(new Date(Date.now() - YESTERDAY_MS));
    const { success, error } = parseWithEndDate(yesterday);

    expect(success).toBe(false);
    expect(error?.issues[0]?.message).toBe("The end date can't be in the past.");
  });
});
