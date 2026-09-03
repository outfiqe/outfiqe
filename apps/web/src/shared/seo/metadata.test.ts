import { describe, expect, it } from "vitest";

import { buildPageMetadata, noIndexMetadata, rootMetadataDefaults } from "./metadata";

describe("buildPageMetadata", () => {
  it("sets an absolute canonical from the path", () => {
    const meta = buildPageMetadata({ title: "About", description: "d", path: "/about" });
    expect(String(meta.alternates?.canonical)).toMatch(/\/about$/);
  });

  it("indexes by default and applies the title template", () => {
    const meta = buildPageMetadata({ title: "About", description: "d", path: "/about" });
    expect(meta.robots).toMatchObject({ index: true, follow: true });
    expect(meta.title).toBe("About");
  });

  it("supports an absolute title that bypasses the template", () => {
    const meta = buildPageMetadata({
      title: "Outfiqe — home",
      description: "d",
      path: "/",
      absoluteTitle: true,
    });
    expect(meta.title).toEqual({ absolute: "Outfiqe — home" });
  });

  it("noIndex flips the robots block and drops nothing else", () => {
    const meta = buildPageMetadata({
      title: "Gone",
      description: "d",
      path: "/product/x",
      noIndex: true,
    });
    expect(meta.robots).toMatchObject({ index: false, follow: false });
  });

  it("only attaches OG and Twitter images when an image is given", () => {
    const without = buildPageMetadata({ title: "t", description: "d", path: "/p" });
    expect(without.openGraph).not.toHaveProperty("images");
    expect(without.twitter).not.toHaveProperty("images");

    const withImage = buildPageMetadata({
      title: "t",
      description: "d",
      path: "/p",
      image: { url: "https://cdn/x.jpg", alt: "x" },
    });
    expect(withImage.openGraph).toHaveProperty("images");
    expect(withImage.twitter).toHaveProperty("images");
  });
});

describe("noIndexMetadata", () => {
  it("returns a titled, non-indexed metadata object", () => {
    expect(noIndexMetadata("Dashboard")).toMatchObject({
      title: "Dashboard",
      robots: { index: false, follow: false },
    });
  });
});

describe("rootMetadataDefaults", () => {
  it("declares a title template and a real description", () => {
    expect(rootMetadataDefaults.title).toMatchObject({ template: "%s · Outfiqe" });
    expect(String(rootMetadataDefaults.description)).not.toMatch(/placeholder/i);
  });
});
