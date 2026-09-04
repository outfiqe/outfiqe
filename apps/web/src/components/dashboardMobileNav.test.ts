import type { SidebarNavItem } from "@outfiqe/components";
import { describe, expect, it } from "vitest";

import { isCrossAppNavHref, resolvePinnedIds, shouldDismissOnSwipe } from "./dashboardMobileNav";

const navItem = (id: string): SidebarNavItem => ({ id, label: id, href: `/${id}` });
const navItems = ["overview", "profile", "progress", "badges", "challenges", "security"].map(
  navItem,
);

describe("resolvePinnedIds", () => {
  it("falls back to the first four items when nothing is stored", () => {
    expect(resolvePinnedIds(navItems, null)).toEqual(["overview", "profile", "progress", "badges"]);
  });

  it("keeps the stored order and drops ids that are no longer available", () => {
    expect(resolvePinnedIds(navItems, ["security", "gone", "profile", "overview"])).toEqual([
      "security",
      "profile",
      "overview",
      "progress",
    ]);
  });

  it("pads a short selection from the defaults without duplicating", () => {
    expect(resolvePinnedIds(navItems, ["challenges"])).toEqual([
      "challenges",
      "overview",
      "profile",
      "progress",
    ]);
  });

  it("caps the selection at four", () => {
    expect(
      resolvePinnedIds(navItems, ["overview", "profile", "progress", "badges", "challenges"]),
    ).toHaveLength(4);
  });
});

describe("shouldDismissOnSwipe", () => {
  it("dismisses on a long drag", () => {
    expect(shouldDismissOnSwipe(120, 0)).toBe(true);
  });

  it("dismisses on a fast fling", () => {
    expect(shouldDismissOnSwipe(10, 900)).toBe(true);
  });

  it("keeps the panel open for a small, slow drag", () => {
    expect(shouldDismissOnSwipe(20, 100)).toBe(false);
  });
});

describe("isCrossAppNavHref", () => {
  it("treats admin and absolute urls as cross-app", () => {
    expect(isCrossAppNavHref("/admin/crm")).toBe(true);
    expect(isCrossAppNavHref("https://example.com")).toBe(true);
  });

  it("treats in-app paths as same-app", () => {
    expect(isCrossAppNavHref("/overview")).toBe(false);
  });
});
