import { describe, expect, it } from "vitest";

import {
  DETAIL_ROUTE_SKELETON_KEY,
  resolveDetailRouteSkeletonKey,
} from "./resolveDetailRouteSkeleton";

describe("resolveDetailRouteSkeletonKey", () => {
  it.each([
    ["/admin/orders/9c1d", DETAIL_ROUTE_SKELETON_KEY.ORDER],
    ["/admin/support/ticket-1", DETAIL_ROUTE_SKELETON_KEY.SUPPORT_TICKET],
    ["/admin/platform/metrics/org-1", DETAIL_ROUTE_SKELETON_KEY.TENANT_METRICS],
    ["/admin/gamification/badges/new", DETAIL_ROUTE_SKELETON_KEY.BADGE_FORM],
    ["/admin/gamification/badges/badge-1/edit", DETAIL_ROUTE_SKELETON_KEY.BADGE_FORM],
    ["/orders/9c1d/", DETAIL_ROUTE_SKELETON_KEY.ORDER],
  ])("maps %s to its detail skeleton", (pathname, expectedKey) => {
    expect(resolveDetailRouteSkeletonKey(pathname)).toBe(expectedKey);
  });

  it.each([
    "/admin/orders",
    "/admin/support",
    "/admin/platform/metrics",
    "/admin/crm/customers/u1",
  ])("returns null for %s", (pathname) => {
    expect(resolveDetailRouteSkeletonKey(pathname)).toBeNull();
  });
});
