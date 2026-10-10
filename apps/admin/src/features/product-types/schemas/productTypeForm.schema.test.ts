import { describe, expect, it } from "vitest";

import { productTypeFormSchema } from "./productTypeForm.schema";

const messageFor = (values: { label: string; slug: string }, field: "label" | "slug") => {
  const result = productTypeFormSchema.safeParse(values);
  return result.success
    ? undefined
    : result.error.issues.find((issue) => issue.path[0] === field)?.message;
};

describe("productTypeFormSchema", () => {
  it("accepts a name and a valid slug", () => {
    expect(productTypeFormSchema.safeParse({ label: "Shoes", slug: "shoes" }).success).toBe(true);
  });

  it("asks for both fields when they are empty", () => {
    expect(messageFor({ label: " ", slug: "" }, "label")).toBe(
      "Enter a name for the garment type.",
    );
    expect(messageFor({ label: " ", slug: "" }, "slug")).toBe("Enter a slug for the garment type.");
  });

  it("rejects too short and too long values", () => {
    expect(messageFor({ label: "A", slug: "shoes" }, "label")).toBe("Use at least 2 characters.");
    expect(messageFor({ label: "a".repeat(41), slug: "shoes" }, "label")).toBe(
      "Use at most 40 characters.",
    );
    expect(messageFor({ label: "Shoes", slug: "a".repeat(41) }, "slug")).toBe(
      "Use at most 40 characters.",
    );
  });

  it("rejects a slug with capitals, spaces or repeated hyphens", () => {
    expect(messageFor({ label: "Shoes", slug: "Big Shoes" }, "slug")).toBe(
      "Use lowercase letters, numbers and hyphens only.",
    );
    expect(messageFor({ label: "Shoes", slug: "big--shoes" }, "slug")).toBe(
      "Use lowercase letters, numbers and hyphens only.",
    );
  });
});
