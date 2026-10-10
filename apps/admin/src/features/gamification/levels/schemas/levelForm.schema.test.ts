import { describe, expect, it } from "vitest";

import { EMPTY_LEVEL_FORM, levelFormSchema } from "./levelForm.schema";

const validForm = { level: "3", name: "Trendsetter", requiredXp: "1500", icon: "🔥" };

const messageFor = (overrides: Partial<typeof validForm>, field: string) => {
  const result = levelFormSchema.safeParse({ ...validForm, ...overrides });
  return result.success
    ? undefined
    : [...result.error.issues].reverse().find((issue) => issue.path[0] === field)?.message;
};

describe("levelFormSchema", () => {
  it("accepts a complete form and an empty icon", () => {
    expect(levelFormSchema.safeParse(validForm).success).toBe(true);
    expect(levelFormSchema.safeParse({ ...validForm, icon: "" }).success).toBe(true);
  });

  it("asks for every required field on an empty form", () => {
    expect(levelFormSchema.safeParse(EMPTY_LEVEL_FORM).success).toBe(false);
    expect(messageFor({ level: "" }, "level")).toBe("Enter a level number.");
    expect(messageFor({ name: " " }, "name")).toBe("Enter a name for the level.");
    expect(messageFor({ requiredXp: "" }, "requiredXp")).toBe("Enter the required XP.");
  });

  it("starts level numbers at 1 and allows zero required XP", () => {
    expect(messageFor({ level: "0" }, "level")).toBe("Level numbers start at 1.");
    expect(messageFor({ requiredXp: "0" }, "requiredXp")).toBeUndefined();
  });

  it("rejects decimals, negatives and an icon that is too long", () => {
    expect(messageFor({ requiredXp: "1.5" }, "requiredXp")).toBe(
      "Use a whole number with no decimals or minus sign.",
    );
    expect(messageFor({ requiredXp: "-5" }, "requiredXp")).toBe(
      "Use a whole number with no decimals or minus sign.",
    );
    expect(messageFor({ icon: "123456789" }, "icon")).toBe("Use at most 8 characters.");
  });
});
