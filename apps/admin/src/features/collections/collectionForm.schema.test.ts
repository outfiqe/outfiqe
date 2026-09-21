import { describe, expect, it } from "vitest";

import { collectionFormSchema } from "./collectionForm.schema";

type Values = { name: string; slug: string; description?: string };

const parse = (values: Values) =>
  collectionFormSchema.safeParse({
    description: "",
    imageUrl: null,
    imageAssetId: null,
    ...values,
  });

const messageFor = (values: Values, field: "name" | "slug" | "description") => {
  const result = parse(values);
  return result.success
    ? undefined
    : result.error.issues.find((issue) => issue.path[0] === field)?.message;
};

describe("collectionFormSchema", () => {
  it("accepts a name and slug with an empty optional description", () => {
    expect(parse({ name: "Dashain Edit", slug: "dashain-edit" }).success).toBe(true);
  });

  it("asks for a name and a slug when they are empty", () => {
    expect(messageFor({ name: " ", slug: "" }, "name")).toBe("Enter a name for the collection.");
    expect(messageFor({ name: " ", slug: "" }, "slug")).toBe("Enter a slug for the collection.");
  });

  it("rejects a slug with capitals or spaces", () => {
    expect(messageFor({ name: "Ok", slug: "Dashain Edit" }, "slug")).toBe(
      "Use lowercase letters, numbers and hyphens only.",
    );
  });

  it("rejects a name or slug over eighty characters and a description over 280", () => {
    expect(messageFor({ name: "a".repeat(81), slug: "ok" }, "name")).toBe(
      "Use at most 80 characters.",
    );
    expect(messageFor({ name: "Ok", slug: "a".repeat(81) }, "slug")).toBe(
      "Use at most 80 characters.",
    );
    expect(
      messageFor({ name: "Ok", slug: "ok", description: "a".repeat(281) }, "description"),
    ).toBe("Use at most 280 characters.");
  });
});
