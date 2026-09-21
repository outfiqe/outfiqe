import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminPageSkeleton } from "./AdminPageSkeleton";
import type { AdminPageSkeletonSpec, SkeletonBlock } from "./adminPageSkeleton.types";
import { ADMIN_PAGE_SKELETON_SPECS } from "./adminPageSkeletonSpecs";
import { resolveAdminPageSkeletonSpec } from "./resolveAdminPageSkeleton";

const ADMIN_APP_ROOT = resolve(__dirname, "../../..");

const normalizeSourceText = (source: string): string =>
  source
    .replaceAll("&amp;", "&")
    .replaceAll("&apos;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("’", "'")
    .replace(/\s+/g, " ");

const staticStringsOf = (block: SkeletonBlock): string[] => {
  switch (block.kind) {
    case "filterTabs":
      return [...block.labels, ...(block.actionLabel ? [block.actionLabel] : [])];
    case "searchInput":
      return [block.placeholder];
    case "selectBar":
      return [...block.options];
    case "labeledStats":
      return [...block.labels];
    case "labeledSelect":
      return [block.label];
    case "section":
      return [
        block.title,
        ...(block.description ? [block.description] : []),
        ...(block.actionLabel ? [block.actionLabel] : []),
        ...block.blocks.flatMap(staticStringsOf),
      ];
    case "formCard":
      return [
        ...block.fields.map((field) => field.label),
        ...(block.submitLabel ? [block.submitLabel] : []),
      ];
    case "cardRows":
      return [...block.actionLabels];
    case "actionRows":
      return block.actionLabel ? [block.actionLabel] : [];
    default:
      return [];
  }
};

const staticStringsOfSpec = (spec: AdminPageSkeletonSpec): string[] => [
  spec.title,
  ...(spec.description ? [spec.description] : []),
  ...(spec.headerActionLabel ? [spec.headerActionLabel] : []),
  ...spec.blocks.flatMap(staticStringsOf),
];

const readSources = (spec: AdminPageSkeletonSpec): string =>
  normalizeSourceText(
    spec.sourceFiles.map((file) => readFileSync(resolve(ADMIN_APP_ROOT, file), "utf8")).join("\n"),
  );

describe("admin page skeleton specs", () => {
  it.each(Object.entries(ADMIN_PAGE_SKELETON_SPECS))(
    "%s only shows text that the real page still contains",
    (_path, spec) => {
      const sources = readSources(spec);
      const lowerCasedSources = sources.toLowerCase();
      const missing = staticStringsOfSpec(spec).filter((text) => {
        const needle = normalizeSourceText(text);
        return !sources.includes(needle) && !lowerCasedSources.includes(needle.toLowerCase());
      });

      expect(missing).toEqual([]);
    },
  );

  it.each(Object.entries(ADMIN_PAGE_SKELETON_SPECS))(
    "%s renders its own heading",
    (_path, spec) => {
      render(<AdminPageSkeleton spec={spec} />);

      expect(screen.getByRole("heading", { level: 1, name: spec.title })).toBeInTheDocument();
    },
  );
});

describe("resolveAdminPageSkeletonSpec", () => {
  it("finds a page by its path, with or without the admin base path or a trailing slash", () => {
    expect(resolveAdminPageSkeletonSpec("/admin/announcements")?.title).toBe("Announcements");
    expect(resolveAdminPageSkeletonSpec("/announcements/")?.title).toBe("Announcements");
  });

  it("returns null for a page without its own skeleton", () => {
    expect(resolveAdminPageSkeletonSpec("/admin/some-unknown-page")).toBeNull();
  });
});
