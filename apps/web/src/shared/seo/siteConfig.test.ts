import { describe, expect, it } from "vitest";

import { absoluteUrl, logoUrl, siteUrl } from "./siteConfig";

describe("absoluteUrl", () => {
  it("returns an already-absolute url untouched", () => {
    expect(absoluteUrl("https://cdn.example/x.jpg")).toBe("https://cdn.example/x.jpg");
  });

  it("prefixes the site url and adds a leading slash when the path has none", () => {
    expect(absoluteUrl("shop")).toBe(`${siteUrl}/shop`);
  });

  it("keeps an existing leading slash", () => {
    expect(absoluteUrl("/shop")).toBe(`${siteUrl}/shop`);
  });

  it("builds the logo url from the site root", () => {
    expect(logoUrl).toBe(`${siteUrl}/logo.svg`);
  });
});
