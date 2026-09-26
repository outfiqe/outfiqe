import { readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { AdminUser } from "@/features/auth/schemas";

import { resolveAdminLanding, resolvePlatformPathAccess } from "./adminLanding";

const ROUTES_DIRECTORY = path.resolve(import.meta.dirname, "../routes");
const AUTHENTICATED_ROUTE_PREFIX = "_authenticated.";
const AUTHENTICATED_LAYOUT_FILE = "_authenticated.tsx";
const PATHS_OUTSIDE_THE_PLATFORM = ["/", "/profile", "/platform"];

const EVERY_SECTION_BUT_SUPPORT = [
  "brand-applications",
  "platform-metrics",
  "platform-features",
  "platform-impersonation",
  "platform-nav-access",
  "users",
  "products",
  "collections",
  "categories",
  "product-types",
  "size-options",
  "hero-slides",
  "orders",
  "product-reviews",
  "tag-reviews",
  "tag-reports",
  "content-reports",
  "content-browser",
  "trending",
  "creators",
  "commissions",
  "platform-commission",
  "withdraw-requests",
  "withdraw-policy",
  "bank-accounts",
  "financial-rollup",
  "coupons",
  "gamification",
  "delivery-zones",
  "organizations",
  "team",
  "announcements",
];

const buildUser = (overrides: Partial<AdminUser> = {}): AdminUser => ({
  id: "user-1",
  name: "Staff Member",
  email: "staff@outfiqe.test",
  avatarUrl: null,
  role: "ADMIN",
  hasPlatformAccess: true,
  isCoFounder: false,
  hiddenPlatformNavKeys: [],
  platformPermissionKeys: [],
  crmHomeSubdomain: null,
  ...overrides,
});

const supportAgent = buildUser({
  platformPermissionKeys: ["platform:support:read", "platform:support:respond"],
  hiddenPlatformNavKeys: EVERY_SECTION_BUT_SUPPORT,
});

const tenantStaff = buildUser({
  role: "TENANT_STAFF",
  hasPlatformAccess: false,
  crmHomeSubdomain: "evergreen",
});

const routeFileToPath = (fileName: string): string => {
  const segments = fileName
    .replace(/\.tsx$/, "")
    .replace(AUTHENTICATED_ROUTE_PREFIX, "")
    .split(".")
    .filter((segment) => segment !== "index");
  return `/${segments.join("/")}`;
};

describe("resolveAdminLanding", () => {
  it("sends a support-only staff member straight to support", () => {
    expect(resolveAdminLanding(supportAgent, false)).toEqual({ kind: "route", href: "/support" });
  });

  it("sends staff who can read cross-tenant metrics to the platform overview", () => {
    const analyst = buildUser({ platformPermissionKeys: ["platform:metrics:read"] });

    expect(resolveAdminLanding(analyst, false)).toEqual({ kind: "route", href: "/platform" });
  });

  it("sends a co-founder to the platform overview", () => {
    expect(resolveAdminLanding(buildUser({ isCoFounder: true }), false)).toEqual({
      kind: "route",
      href: "/platform",
    });
  });

  it("reports that a platform role has no pages when every section is hidden", () => {
    const auditOnly = buildUser({
      platformPermissionKeys: ["platform:audit:read"],
      hiddenPlatformNavKeys: [...EVERY_SECTION_BUT_SUPPORT, "support"],
    });

    expect(resolveAdminLanding(auditOnly, false)).toEqual({ kind: "no-sections" });
  });

  it("sends tenant staff on the bare platform address to their own tenant", () => {
    expect(resolveAdminLanding(tenantStaff, false)).toEqual({
      kind: "tenant",
      subdomain: "evergreen",
    });
  });

  it("keeps tenant staff who are already on a tenant address in that tenant's CRM", () => {
    expect(resolveAdminLanding(tenantStaff, true)).toEqual({ kind: "route", href: "/crm" });
  });

  it("keeps platform staff who open a tenant address in that tenant's CRM", () => {
    expect(resolveAdminLanding(buildUser({ isCoFounder: true }), true)).toEqual({
      kind: "route",
      href: "/crm",
    });
  });

  it("sends staff with no tenant and no platform access to the CRM page, which explains the problem", () => {
    const orphan = buildUser({ hasPlatformAccess: false });

    expect(resolveAdminLanding(orphan, false)).toEqual({ kind: "route", href: "/crm" });
  });
});

describe("resolvePlatformPathAccess", () => {
  it("lets a support-only staff member open support pages, including a single request", () => {
    expect(resolvePlatformPathAccess(supportAgent, "/support")).toBe("allowed");
    expect(resolvePlatformPathAccess(supportAgent, "/support/ticket-1")).toBe("allowed");
  });

  it("refuses a support-only staff member every other platform page", () => {
    expect(resolvePlatformPathAccess(supportAgent, "/products")).toBe("denied");
    expect(resolvePlatformPathAccess(supportAgent, "/orders/order-1")).toBe("denied");
    expect(resolvePlatformPathAccess(supportAgent, "/gamification/badges/new")).toBe("denied");
    expect(resolvePlatformPathAccess(supportAgent, "/platform/metrics/org-1")).toBe("denied");
    expect(resolvePlatformPathAccess(supportAgent, "/platform")).toBe("denied");
  });

  it("does not confuse a page whose path merely starts with another page's name", () => {
    const commissionsOnly = buildUser({
      hiddenPlatformNavKeys: EVERY_SECTION_BUT_SUPPORT.filter(
        (sectionKey) => sectionKey !== "platform-commission",
      ).concat("support"),
    });

    expect(resolvePlatformPathAccess(commissionsOnly, "/platform-commission")).toBe("allowed");
    expect(resolvePlatformPathAccess(commissionsOnly, "/platform")).toBe("denied");
  });

  it("keeps navigation access for co-founders only", () => {
    expect(resolvePlatformPathAccess(buildUser(), "/platform/nav-access")).toBe("denied");
    expect(
      resolvePlatformPathAccess(buildUser({ isCoFounder: true }), "/platform/nav-access"),
    ).toBe("allowed");
  });

  it("refuses tenant staff every platform page", () => {
    expect(resolvePlatformPathAccess(tenantStaff, "/support")).toBe("denied");
    expect(resolvePlatformPathAccess(tenantStaff, "/users")).toBe("denied");
  });

  it("leaves CRM and profile pages to their own checks", () => {
    expect(resolvePlatformPathAccess(tenantStaff, "/crm")).toBe("not-platform");
    expect(resolvePlatformPathAccess(tenantStaff, "/crm/tasks")).toBe("not-platform");
    expect(resolvePlatformPathAccess(supportAgent, "/profile")).toBe("not-platform");
  });

  it("covers every platform page in the app with a menu section, so no page is left unguarded", () => {
    const platformPagePaths = readdirSync(ROUTES_DIRECTORY)
      .filter((fileName) => fileName.startsWith(AUTHENTICATED_ROUTE_PREFIX))
      .filter((fileName) => fileName !== AUTHENTICATED_LAYOUT_FILE)
      .filter((fileName) => !fileName.startsWith(`${AUTHENTICATED_ROUTE_PREFIX}crm.`))
      .map(routeFileToPath)
      .filter((pagePath) => !PATHS_OUTSIDE_THE_PLATFORM.includes(pagePath));
    const nobody = buildUser({ hasPlatformAccess: false });

    const unguardedPages = platformPagePaths.filter(
      (pagePath) => resolvePlatformPathAccess(nobody, pagePath) !== "denied",
    );

    expect(platformPagePaths.length).toBeGreaterThan(30);
    expect(unguardedPages).toEqual([]);
  });
});
