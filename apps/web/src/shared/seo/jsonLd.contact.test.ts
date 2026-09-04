import { describe, expect, it, vi } from "vitest";

import { organizationSchema } from "./jsonLd";

vi.mock("./siteConfig", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    contactEmail: "help@outfiqe.test",
    socialProfileUrls: ["https://instagram.com/outfiqe", "https://tiktok.com/@outfiqe"],
  };
});

describe("organizationSchema with contact details configured", () => {
  it("includes a customer-support contactPoint", () => {
    const contact = organizationSchema().contactPoint as Record<string, unknown>;
    expect(contact["@type"]).toBe("ContactPoint");
    expect(contact.contactType).toBe("customer support");
    expect(contact.email).toBe("help@outfiqe.test");
  });

  it("lists the configured social profiles under sameAs", () => {
    expect(organizationSchema().sameAs).toEqual([
      "https://instagram.com/outfiqe",
      "https://tiktok.com/@outfiqe",
    ]);
  });
});
