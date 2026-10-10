import { describe, expect, it } from "vitest";

import { competitionFormSchema, EMPTY_COMPETITION_FORM } from "./competitionForm.schema";

const validForm = { ...EMPTY_COMPETITION_FORM, name: "Weekly Style Sprint" };

const messageFor = (overrides: Partial<typeof validForm>, field: string) => {
  const result = competitionFormSchema.safeParse({ ...validForm, ...overrides });
  return result.success
    ? undefined
    : [...result.error.issues].reverse().find((issue) => issue.path[0] === field)?.message;
};

describe("competitionFormSchema", () => {
  it("accepts the defaults once a name is entered", () => {
    expect(competitionFormSchema.safeParse(validForm).success).toBe(true);
  });

  it("asks for a name and an icon", () => {
    expect(messageFor({ name: "  " }, "name")).toBe("Enter a name for the competition.");
    expect(messageFor({ icon: "" }, "icon")).toBe("Enter an icon for the trophy.");
    expect(messageFor({ icon: "123456789" }, "icon")).toBe("Use at most 8 characters.");
  });

  it("keeps the number of winners between 1 and 10", () => {
    expect(messageFor({ topN: "" }, "topN")).toBe("Enter how many winners.");
    expect(messageFor({ topN: "0" }, "topN")).toBe("Pick at least 1 winner.");
    expect(messageFor({ topN: "11" }, "topN")).toBe("Use a number up to 10.");
    expect(messageFor({ topN: "10" }, "topN")).toBeUndefined();
  });

  it("allows a zero XP reward but not a decimal or negative one", () => {
    expect(messageFor({ xpReward: "0" }, "xpReward")).toBeUndefined();
    expect(messageFor({ xpReward: "2.5" }, "xpReward")).toBe(
      "Use a whole number with no decimals or minus sign.",
    );
    expect(messageFor({ xpReward: "-1" }, "xpReward")).toBe(
      "Use a whole number with no decimals or minus sign.",
    );
  });
});
