import { describe, expect, it } from "vitest";

import { contactFormSchema, EMPTY_CONTACT_FORM, parseContactTags } from "./contactForm.schema";

const VALID = { ...EMPTY_CONTACT_FORM, name: "Ava Martinez" };

const messageFor = (overrides: Partial<typeof VALID>, field: keyof typeof VALID) => {
  const result = contactFormSchema.safeParse({ ...VALID, ...overrides });
  return result.success
    ? undefined
    : result.error.issues.find((issue) => issue.path[0] === field)?.message;
};

describe("contactFormSchema", () => {
  it("accepts a contact with only a name", () => {
    expect(contactFormSchema.safeParse(VALID).success).toBe(true);
  });

  it("asks for a name", () => {
    expect(messageFor({ name: "   " }, "name")).toBe("Enter the contact's name.");
  });

  it("accepts an empty email but rejects one that is not an address", () => {
    expect(messageFor({ email: "" }, "email")).toBeUndefined();
    expect(messageFor({ email: "not-an-email" }, "email")).toBe("Enter a valid email address.");
    expect(messageFor({ email: "ava@example.com" }, "email")).toBeUndefined();
  });

  it("enforces the API's length limits", () => {
    expect(messageFor({ name: "a".repeat(141) }, "name")).toBe("Use at most 140 characters.");
    expect(messageFor({ phone: "9".repeat(41) }, "phone")).toBe("Use at most 40 characters.");
    expect(messageFor({ source: "a".repeat(81) }, "source")).toBe("Use at most 80 characters.");
    expect(messageFor({ notes: "a".repeat(5001) }, "notes")).toBe("Use at most 5000 characters.");
  });

  it("limits the number of tags and the length of each", () => {
    const tooManyTags = Array.from({ length: 21 }, (_unused, index) => `t${index}`).join(", ");

    expect(messageFor({ tags: tooManyTags }, "tags")).toBe("Use at most 20 tags.");
    expect(messageFor({ tags: "a".repeat(41) }, "tags")).toBe(
      "Keep each tag to 40 characters or fewer.",
    );
  });
});

describe("parseContactTags", () => {
  it("splits on commas, trims, and drops empty tags", () => {
    expect(parseContactTags(" vip, , new  ,")).toEqual(["vip", "new"]);
  });
});
