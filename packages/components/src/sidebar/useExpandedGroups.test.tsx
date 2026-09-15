import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { SidebarNavSection } from "./types";
import { useExpandedGroups } from "./useExpandedGroups";

const sections: SidebarNavSection[] = [
  {
    id: "platform",
    items: [
      {
        id: "catalog",
        href: "/products",
        label: "Catalog",
        items: [
          { id: "products", href: "/products", label: "Products" },
          { id: "categories", href: "/categories", label: "Categories" },
        ],
      },
      {
        id: "growth",
        href: "/creators",
        label: "Growth",
        items: [
          { id: "creators", href: "/creators", label: "Creators" },
          { id: "trending", href: "/trending", label: "Trending" },
        ],
      },
      { id: "orders", href: "/orders", label: "Orders" },
    ],
  },
];

const isActive = (href: string, pathname: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);

describe("useExpandedGroups", () => {
  it("auto-expands the group containing the active route", () => {
    const { result } = renderHook(
      ({ pathname }) => useExpandedGroups(sections, pathname, isActive),
      { initialProps: { pathname: "/products" } },
    );

    expect(result.current.isExpanded("catalog")).toBe(true);
    expect(result.current.isExpanded("growth")).toBe(false);
  });

  it("keeps a manually expanded group open when navigating to an unrelated route", () => {
    const { result, rerender } = renderHook(
      ({ pathname }) => useExpandedGroups(sections, pathname, isActive),
      { initialProps: { pathname: "/products" } },
    );

    act(() => result.current.toggle("growth"));
    expect(result.current.isExpanded("growth")).toBe(true);

    rerender({ pathname: "/categories" });

    expect(result.current.isExpanded("growth")).toBe(true);
    expect(result.current.isExpanded("catalog")).toBe(true);
  });

  it("resets a manually collapsed group's override once it leaves the active trail", () => {
    const { result, rerender } = renderHook(
      ({ pathname }) => useExpandedGroups(sections, pathname, isActive),
      { initialProps: { pathname: "/products" } },
    );

    act(() => result.current.toggle("catalog"));
    expect(result.current.isExpanded("catalog")).toBe(false);

    rerender({ pathname: "/orders" });
    rerender({ pathname: "/categories" });

    expect(result.current.isExpanded("catalog")).toBe(true);
  });

  it("still lets a manual toggle collapse the currently active group", () => {
    const { result } = renderHook(
      ({ pathname }) => useExpandedGroups(sections, pathname, isActive),
      { initialProps: { pathname: "/products" } },
    );

    expect(result.current.isExpanded("catalog")).toBe(true);
    act(() => result.current.toggle("catalog"));
    expect(result.current.isExpanded("catalog")).toBe(false);
  });
});
