import { describe, expect, it } from "vitest";

import { PAGE_SKELETON_KIND, resolvePageSkeletonKind } from "./resolvePageSkeletonKind";

describe("resolvePageSkeletonKind", () => {
  it.each([
    ["/platform", PAGE_SKELETON_KIND.DASHBOARD],
    ["/crm", PAGE_SKELETON_KIND.DASHBOARD],
    ["/platform/metrics/3f2a", PAGE_SKELETON_KIND.DASHBOARD],
    ["/crm/pipeline", PAGE_SKELETON_KIND.KANBAN],
    ["/orders/9c1d", PAGE_SKELETON_KIND.DETAIL_FORM],
    ["/gamification/badges/new", PAGE_SKELETON_KIND.DETAIL_FORM],
    ["/gamification/badges/7b/edit", PAGE_SKELETON_KIND.DETAIL_FORM],
    ["/profile", PAGE_SKELETON_KIND.DETAIL_FORM],
    ["/orders", PAGE_SKELETON_KIND.LIST],
    ["/gamification/badges", PAGE_SKELETON_KIND.LIST],
    ["/crm/customers", PAGE_SKELETON_KIND.LIST],
    ["/team", PAGE_SKELETON_KIND.GENERIC],
    ["/somewhere-new", PAGE_SKELETON_KIND.GENERIC],
  ])("maps %s to the %s skeleton", (pathname, expectedKind) => {
    expect(resolvePageSkeletonKind(pathname)).toBe(expectedKind);
  });

  it("ignores the admin base path and a trailing slash", () => {
    expect(resolvePageSkeletonKind("/admin/orders/")).toBe(PAGE_SKELETON_KIND.LIST);
    expect(resolvePageSkeletonKind("/admin/platform")).toBe(PAGE_SKELETON_KIND.DASHBOARD);
  });

  it("keeps a customer detail page apart from the customers list", () => {
    expect(resolvePageSkeletonKind("/crm/customers/42")).toBe(PAGE_SKELETON_KIND.DETAIL_FORM);
    expect(resolvePageSkeletonKind("/crm/customers")).toBe(PAGE_SKELETON_KIND.LIST);
  });
});
