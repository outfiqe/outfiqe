import type { SidebarNavItem } from "@outfiqe/components";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useDashboardMobileNav } from "./useDashboardMobileNav";
import { useDashboardNav } from "./useDashboardNav";
import { useNavPreferences } from "./useNavPreferences";

vi.mock("./useDashboardNav", () => ({ useDashboardNav: vi.fn() }));
vi.mock("./useNavPreferences", () => ({ useNavPreferences: vi.fn() }));

const navItem = (id: string): SidebarNavItem => ({ id, label: id, href: `/${id}` });
const navItems = ["overview", "profile", "progress", "badges", "challenges", "security"].map(
  navItem,
);

const save = vi.fn();
const reset = vi.fn();

beforeEach(() => {
  vi.mocked(useDashboardNav).mockReturnValue({
    navItems,
    isBrand: false,
    accountLabel: "Creator account",
  });
  vi.mocked(useNavPreferences).mockReturnValue({
    pinnedIds: null,
    isCustomized: false,
    save,
    reset,
  });
});

describe("useDashboardMobileNav", () => {
  it("pins the first four items and pushes the rest to overflow by default", () => {
    const { result } = renderHook(() => useDashboardMobileNav());

    expect(result.current.pinnedItems.map((item) => item.id)).toEqual([
      "overview",
      "profile",
      "progress",
      "badges",
    ]);
    expect(result.current.overflowItems.map((item) => item.id)).toEqual(["challenges", "security"]);
    expect(result.current.allItems).toHaveLength(6);
  });

  it("honours a stored selection and recomputes overflow", () => {
    vi.mocked(useNavPreferences).mockReturnValue({
      pinnedIds: ["security", "profile", "challenges", "overview"],
      isCustomized: true,
      save,
      reset,
    });

    const { result } = renderHook(() => useDashboardMobileNav());

    expect(result.current.pinnedItems.map((item) => item.id)).toEqual([
      "security",
      "profile",
      "challenges",
      "overview",
    ]);
    expect(result.current.overflowItems.map((item) => item.id)).toEqual(["progress", "badges"]);
  });
});
