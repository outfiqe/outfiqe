import { describe, expect, it } from "vitest";

import { EMPTY_HUB_FORM } from "../utils/hubForm.utils";
import { hubFormSchema } from "./hubForm.schema";

const VALID = {
  ...EMPTY_HUB_FORM,
  name: "Kathmandu Hub",
  address: "Teku Road",
  city: "Kathmandu",
  phone: "9812345678",
};

const messageFor = (overrides: Partial<typeof VALID>, field: keyof typeof VALID) => {
  const result = hubFormSchema.safeParse({ ...VALID, ...overrides });
  return result.success
    ? undefined
    : result.error.issues.find((issue) => issue.path[0] === field)?.message;
};

describe("hubFormSchema", () => {
  it("accepts a complete hub", () => {
    expect(hubFormSchema.safeParse(VALID).success).toBe(true);
  });

  it("refuses a hub that closes before it opens", () => {
    expect(messageFor({ openTime: "19:00", closeTime: "09:00" }, "closeTime")).toBe(
      "The hub must close after it opens.",
    );
  });

  it("refuses badly written round times", () => {
    expect(messageFor({ pickupRoundTimes: "11, 3pm" }, "pickupRoundTimes")).toBe(
      "List the round times as HH:mm, separated by commas — for example 11:00, 15:00.",
    );
  });

  it("asks for at least one working day", () => {
    expect(messageFor({ workingDays: [] }, "workingDays")).toBe("Pick at least one working day.");
  });
});
