import { describe, expect, it } from "vitest";

import { crawlerDisallowedPaths, legalRoutes, staticSeoRoutes } from "./routes";

describe("staticSeoRoutes", () => {
  it("every route has an absolute app path and a sane priority", () => {
    for (const route of staticSeoRoutes) {
      expect(route.path.startsWith("/")).toBe(true);
      expect(route.priority).toBeGreaterThan(0);
      expect(route.priority).toBeLessThanOrEqual(1);
    }
  });

  it("has no duplicate paths", () => {
    const paths = staticSeoRoutes.map((route) => route.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("includes the core commerce and trust pages", () => {
    const paths = new Set(staticSeoRoutes.map((route) => route.path));
    for (const required of [
      "/",
      "/shop",
      "/brands",
      "/about",
      "/contact",
      "/help",
      "/for-creators",
      "/for-brands",
      "/legal/privacy",
      "/legal/terms",
    ]) {
      expect(paths.has(required)).toBe(true);
    }
  });

  it("does not list any crawler-disallowed path in the sitemap set", () => {
    for (const route of staticSeoRoutes) {
      const blocked = crawlerDisallowedPaths.some((prefix) => route.path.startsWith(prefix));
      expect(blocked, `${route.path} should not be in the sitemap`).toBe(false);
    }
  });
});

describe("crawlerDisallowedPaths", () => {
  it("covers the private and transactional surfaces", () => {
    for (const required of ["/cart", "/checkout", "/orders", "/messages", "/api/", "/r/"]) {
      expect(crawlerDisallowedPaths).toContain(required);
    }
  });
});

describe("legalRoutes", () => {
  it("all sit under /legal", () => {
    for (const route of legalRoutes) {
      expect(route.path.startsWith("/legal/")).toBe(true);
    }
  });
});
