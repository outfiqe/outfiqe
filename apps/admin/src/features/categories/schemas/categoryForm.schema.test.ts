import { describe, expect, it } from "vitest";

import { categoryFormSchema } from "./categoryForm.schema";

type FormInput = { name: string; slug: string; imageUrl?: string | null };

const parse = (values: FormInput) => categoryFormSchema.safeParse({ imageUrl: null, ...values });

const firstMessageFor = (result: ReturnType<typeof parse>, field: "name" | "slug") =>
  result.success
    ? undefined
    : result.error.issues.find((issue) => issue.path[0] === field)?.message;

describe("categoryFormSchema", () => {
  it("accepts a name and a valid slug, with or without an image", () => {
    expect(parse({ name: "Old Money", slug: "old-money" }).success).toBe(true);
    expect(
      parse({ name: "Old Money", slug: "old-money", imageUrl: "https://x.test/a.png" }).success,
    ).toBe(true);
  });

  it("asks for a name and a slug when they are empty", () => {
    const result = parse({ name: "   ", slug: "" });

    expect(firstMessageFor(result, "name")).toBe("Enter a name for the category.");
    expect(firstMessageFor(result, "slug")).toBe("Enter a slug for the category.");
  });

  it("rejects a one character name and slug", () => {
    const result = parse({ name: "A", slug: "a" });

    expect(firstMessageFor(result, "name")).toBe("Use at least 2 characters.");
    expect(firstMessageFor(result, "slug")).toBe("Use at least 2 characters.");
  });

  it("rejects a slug with capitals, spaces or repeated hyphens", () => {
    expect(firstMessageFor(parse({ name: "Ok", slug: "Old Money" }), "slug")).toBe(
      "Use lowercase letters, numbers and hyphens only.",
    );
    expect(firstMessageFor(parse({ name: "Ok", slug: "old--money" }), "slug")).toBe(
      "Use lowercase letters, numbers and hyphens only.",
    );
  });

  it("rejects a name or slug longer than sixty characters", () => {
    const tooLong = "a".repeat(61);

    expect(firstMessageFor(parse({ name: tooLong, slug: "ok" }), "name")).toBe(
      "Use at most 60 characters.",
    );
    expect(firstMessageFor(parse({ name: "Ok", slug: tooLong }), "slug")).toBe(
      "Use at most 60 characters.",
    );
  });
});
