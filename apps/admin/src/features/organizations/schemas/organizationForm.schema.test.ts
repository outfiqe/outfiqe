import { describe, expect, it } from "vitest";

import { EMPTY_ORGANIZATION_FORM, organizationFormSchema } from "./organizationForm.schema";

const acme = { id: "brand-1", name: "Acme" };

const messagesFor = (values: typeof EMPTY_ORGANIZATION_FORM) => {
  const result = organizationFormSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe("organizationFormSchema", () => {
  it("accepts a picked business with a valid subdomain", () => {
    expect(messagesFor({ brand: acme, subdomain: "acme-nepal" })).toEqual([]);
  });

  it("asks for a business and a subdomain on an empty form", () => {
    expect(messagesFor(EMPTY_ORGANIZATION_FORM)).toEqual(
      expect.arrayContaining(["Choose a business.", "Enter a subdomain."]),
    );
  });

  it("rejects uppercase letters, spaces and edge hyphens", () => {
    const expected =
      "Use lowercase letters, numbers and hyphens, without a hyphen at the start or end.";
    expect(messagesFor({ brand: acme, subdomain: "Acme" })).toContain(expected);
    expect(messagesFor({ brand: acme, subdomain: "my shop" })).toContain(expected);
    expect(messagesFor({ brand: acme, subdomain: "-acme" })).toContain(expected);
    expect(messagesFor({ brand: acme, subdomain: "acme-" })).toContain(expected);
  });

  it("rejects a subdomain longer than 63 characters", () => {
    expect(messagesFor({ brand: acme, subdomain: "a".repeat(64) })).toContain(
      "Use at most 63 characters.",
    );
  });

  it("rejects a reserved subdomain", () => {
    expect(messagesFor({ brand: acme, subdomain: "www" })).toContain(
      "This subdomain is reserved and can't be used.",
    );
  });
});
