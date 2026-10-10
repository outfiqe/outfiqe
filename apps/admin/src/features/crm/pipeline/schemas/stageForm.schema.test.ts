import { describe, expect, it } from "vitest";

import { stageFormSchema } from "./stageForm.schema";

const messageFor = (name: string) => {
  const result = stageFormSchema.safeParse({ name });
  return result.success ? undefined : result.error.issues[0]?.message;
};

describe("stageFormSchema", () => {
  it("accepts a normal stage name", () => {
    expect(stageFormSchema.safeParse({ name: "Negotiation" }).success).toBe(true);
  });

  it("asks for a name and limits it to 60 characters", () => {
    expect(messageFor("   ")).toBe("Enter a name for the stage.");
    expect(messageFor("a".repeat(61))).toBe("Use at most 60 characters.");
  });
});
