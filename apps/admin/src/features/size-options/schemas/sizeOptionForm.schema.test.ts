import { describe, expect, it } from "vitest";

import { sizeOptionFormSchema } from "./sizeOptionForm.schema";

const firstMessage = (label: string) => {
  const result = sizeOptionFormSchema.safeParse({ label });
  return result.success ? undefined : result.error.issues[0]?.message;
};

describe("sizeOptionFormSchema", () => {
  it("accepts a short label", () => {
    expect(sizeOptionFormSchema.safeParse({ label: "XL" }).success).toBe(true);
  });

  it("asks for a label when it is empty or only spaces", () => {
    expect(firstMessage("")).toBe("Enter a size label, such as M or XL.");
    expect(firstMessage("   ")).toBe("Enter a size label, such as M or XL.");
  });

  it("rejects a label longer than twenty characters", () => {
    expect(firstMessage("a".repeat(21))).toBe("Use at most 20 characters.");
  });
});
