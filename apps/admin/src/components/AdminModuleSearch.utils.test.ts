import type { SidebarNavSection } from "@outfiqe/components";
import { describe, expect, it } from "vitest";

import {
  flattenSidebarSections,
  MODULE_SEARCH_MIN_QUERY_LENGTH,
  searchAdminModules,
} from "./AdminModuleSearch.utils";

const SECTIONS: SidebarNavSection[] = [
  {
    id: "crm",
    label: "CRM",
    items: [
      { id: "crm-overview", href: "/crm", label: "Overview" },
      { id: "crm-partners", href: "/crm/partners", label: "Partners" },
    ],
  },
  {
    id: "platform",
    label: "Platform",
    items: [
      { id: "platform-overview", href: "/platform", label: "Overview" },
      {
        id: "platform-group-growth",
        href: "/creators",
        label: "Growth",
        items: [
          { id: "creators", href: "/creators", label: "Creators" },
          { id: "gamification", href: "/gamification", label: "Gamification" },
        ],
      },
    ],
  },
];

describe("flattenSidebarSections", () => {
  it("flattens nested group items into a single list tagged with their section label", () => {
    const flattened = flattenSidebarSections(SECTIONS);

    expect(flattened.map((result) => result.id)).toEqual([
      "crm-overview",
      "crm-partners",
      "platform-overview",
      "platform-group-growth",
      "creators",
      "gamification",
    ]);
    expect(flattened.find((result) => result.id === "creators")?.sectionLabel).toBe("Platform");
    expect(flattened.find((result) => result.id === "crm-partners")?.sectionLabel).toBe("CRM");
  });

  it("includes a group item itself alongside its children", () => {
    const flattened = flattenSidebarSections(SECTIONS);

    const growthGroup = flattened.find((result) => result.id === "platform-group-growth");
    expect(growthGroup).toMatchObject({ label: "Growth", href: "/creators" });
  });

  it("falls back to the section id when a section has no label", () => {
    const flattened = flattenSidebarSections([
      { id: "unlabeled", items: [{ id: "a", href: "/a", label: "A" }] },
    ]);

    expect(flattened[0]?.sectionLabel).toBe("unlabeled");
  });

  it("returns an empty list for empty sections", () => {
    expect(flattenSidebarSections([])).toEqual([]);
  });
});

describe("searchAdminModules", () => {
  const searchableModules = flattenSidebarSections(SECTIONS);

  it("matches case-insensitively anywhere in the label", () => {
    const results = searchAdminModules(searchableModules, "CREAT");

    expect(results.map((result) => result.id)).toEqual(["creators"]);
  });

  it("matches multiple entries sharing a substring", () => {
    const results = searchAdminModules(searchableModules, "overview");

    expect(results.map((result) => result.id).sort()).toEqual([
      "crm-overview",
      "platform-overview",
    ]);
  });

  it("returns nothing for a query below the minimum length", () => {
    expect(MODULE_SEARCH_MIN_QUERY_LENGTH).toBeGreaterThan(1);
    expect(searchAdminModules(searchableModules, "c")).toEqual([]);
  });

  it("returns nothing for a query that matches no module", () => {
    expect(searchAdminModules(searchableModules, "zzz")).toEqual([]);
  });

  it("trims surrounding whitespace before matching", () => {
    const results = searchAdminModules(searchableModules, "  creators  ");

    expect(results.map((result) => result.id)).toEqual(["creators"]);
  });
});
