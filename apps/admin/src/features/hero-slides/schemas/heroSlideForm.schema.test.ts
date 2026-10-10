import { describe, expect, it } from "vitest";

import { EMPTY_HERO_SLIDE_FORM, heroSlideFormSchema } from "./heroSlideForm.schema";

const VALID_SLIDE = {
  ...EMPTY_HERO_SLIDE_FORM,
  tag: "Collection 01: Festive",
  title: "Dashain Edit",
  description: "Styled full looks.",
  ctaLabel: "Explore collection",
  ctaHref: "/collections/dashain-edit",
};

const messageFor = (overrides: Partial<typeof VALID_SLIDE>, field: keyof typeof VALID_SLIDE) => {
  const result = heroSlideFormSchema.safeParse({ ...VALID_SLIDE, ...overrides });
  return result.success
    ? undefined
    : result.error.issues.find((issue) => issue.path[0] === field)?.message;
};

describe("heroSlideFormSchema", () => {
  it("accepts a complete slide without an image", () => {
    expect(heroSlideFormSchema.safeParse(VALID_SLIDE).success).toBe(true);
  });

  it("names each missing field", () => {
    const result = heroSlideFormSchema.safeParse(EMPTY_HERO_SLIDE_FORM);
    const messages = result.success ? [] : result.error.issues.map((issue) => issue.message);

    expect(messages).toEqual([
      "Enter a tag.",
      "Enter a title.",
      "Enter a description.",
      "Enter a button label.",
      "Enter where the button should link to.",
    ]);
  });

  it("treats spaces only as missing", () => {
    expect(messageFor({ title: "   " }, "title")).toBe("Enter a title.");
  });

  it("enforces the same length limits as the API", () => {
    expect(messageFor({ tag: "a".repeat(61) }, "tag")).toBe("Use at most 60 characters.");
    expect(messageFor({ title: "a".repeat(121) }, "title")).toBe("Use at most 120 characters.");
    expect(messageFor({ description: "a".repeat(281) }, "description")).toBe(
      "Use at most 280 characters.",
    );
    expect(messageFor({ ctaLabel: "a".repeat(41) }, "ctaLabel")).toBe("Use at most 40 characters.");
  });
});
