import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { crmAccessRepository } from "#modules/crm-access/crm-access.repository.js";
import {
  createAdminSession,
  createRoleLimitedStaffSession,
} from "#test/integration/authHelpers.js";
import { testApp } from "#test/integration/testApp.js";

import type { PlatformPermissionKey } from "./platform-access.constants.js";

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

type PlatformRoute = {
  method: HttpMethod;
  path: string;
  allowedKeys: readonly PlatformPermissionKey[];
};

const SOME_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_ID = "00000000-0000-4000-8000-000000000002";

const route = (
  method: HttpMethod,
  path: string,
  ...allowedKeys: PlatformPermissionKey[]
): PlatformRoute => ({ method, path, allowedKeys });

const ANNOUNCEMENTS_READ = [
  "platform:announcements:read",
  "platform:announcements:manage",
] as const;
const BRANDS_READ = ["platform:brands:read", "platform:brands:manage"] as const;
const CATALOG_READ = ["platform:catalog:read", "platform:catalog:manage"] as const;
const COMMISSIONS_READ = ["platform:commissions:read", "platform:commissions:manage"] as const;
const COUPONS_READ = ["platform:coupons:read", "platform:coupons:manage"] as const;
const CREATORS_READ = ["platform:creators:read", "platform:creators:manage"] as const;
const GAMIFICATION_READ = ["platform:gamification:read", "platform:gamification:manage"] as const;
const ORDERS_READ = ["platform:orders:read", "platform:orders:manage"] as const;
const ORGANIZATIONS_READ = [
  "platform:organizations:read",
  "platform:organizations:manage",
] as const;
const USERS_READ = ["platform:users:read", "platform:users:manage"] as const;
const WITHDRAW_READ = ["platform:withdraw:read", "platform:withdraw:manage"] as const;
const SUPPORT_READ = [
  "platform:support:read",
  "platform:support:respond",
  "platform:support:manage",
] as const;

const ROUTE_GROUPS: Record<string, PlatformRoute[]> = {
  announcements: [
    route("get", "/api/admin/announcements", ...ANNOUNCEMENTS_READ),
    route("get", `/api/admin/announcements/${SOME_ID}`, ...ANNOUNCEMENTS_READ),
    route("post", "/api/admin/announcements", "platform:announcements:manage"),
    route("patch", `/api/admin/announcements/${SOME_ID}`, "platform:announcements:manage"),
    route("post", `/api/admin/announcements/${SOME_ID}/send`, "platform:announcements:manage"),
    route("post", `/api/admin/announcements/${SOME_ID}/cancel`, "platform:announcements:manage"),
  ],
  gamification: [
    route("get", "/api/badges/admin", ...GAMIFICATION_READ),
    route("get", `/api/badges/admin/${SOME_ID}`, ...GAMIFICATION_READ),
    route("get", "/api/badges/stats", ...GAMIFICATION_READ),
    route("get", "/api/badges/user-badges/manual", ...GAMIFICATION_READ),
    route("post", "/api/badges", "platform:gamification:manage"),
    route("post", `/api/badges/user-badges/${SOME_ID}/remove`, "platform:gamification:manage"),
    route("patch", `/api/badges/${SOME_ID}`, "platform:gamification:manage"),
    route("post", `/api/badges/${SOME_ID}/award`, "platform:gamification:manage"),
    route("get", "/api/challenges/admin", ...GAMIFICATION_READ),
    route("post", "/api/challenges", "platform:gamification:manage"),
    route("patch", `/api/challenges/${SOME_ID}`, "platform:gamification:manage"),
    route("get", "/api/creator-competitions/admin", ...GAMIFICATION_READ),
    route("post", "/api/creator-competitions", "platform:gamification:manage"),
    route("patch", `/api/creator-competitions/${SOME_ID}`, "platform:gamification:manage"),
    route("patch", "/api/creator-leaderboard/categories/STYLING", "platform:gamification:manage"),
    route("get", "/api/xp/levels", ...GAMIFICATION_READ),
    route("post", "/api/xp/levels", "platform:gamification:manage"),
    route("patch", `/api/xp/levels/${SOME_ID}`, "platform:gamification:manage"),
    route("get", "/api/xp/multipliers", ...GAMIFICATION_READ),
    route("post", "/api/xp/multipliers", "platform:gamification:manage"),
    route("patch", `/api/xp/multipliers/${SOME_ID}`, "platform:gamification:manage"),
    route("get", "/api/xp/activity-config", ...GAMIFICATION_READ),
    route("patch", "/api/xp/activity-config/POST_LIKED", "platform:gamification:manage"),
    route("post", "/api/xp/adjust", "platform:xp:manage"),
    route("get", "/api/xp/stats", ...GAMIFICATION_READ),
  ],
  withdrawals: [
    route("get", "/api/withdraw/admin/requests", ...WITHDRAW_READ),
    route("patch", `/api/withdraw/admin/requests/${SOME_ID}/approve`, "platform:withdraw:manage"),
    route("patch", `/api/withdraw/admin/requests/${SOME_ID}/reject`, "platform:withdraw:manage"),
    route("patch", `/api/withdraw/admin/requests/${SOME_ID}/mark-paid`, "platform:withdraw:manage"),
    route("put", "/api/withdraw/admin/policy", "platform:withdraw:manage"),
    route("get", "/api/bank-accounts/admin", ...WITHDRAW_READ),
    route("patch", `/api/bank-accounts/${SOME_ID}/verify`, "platform:withdraw:manage"),
    route("get", `/api/bank-accounts/${SOME_ID}/reveal`, "platform:withdraw:manage"),
    route("get", "/api/brand-bank-accounts/admin", ...WITHDRAW_READ),
    route("patch", `/api/brand-bank-accounts/${SOME_ID}/verify`, "platform:withdraw:manage"),
    route("get", `/api/brand-bank-accounts/${SOME_ID}/reveal`, "platform:withdraw:manage"),
  ],
  brands: [
    route("get", "/api/brand-applications", ...BRANDS_READ),
    route("post", `/api/brand-applications/${SOME_ID}/approve`, "platform:brands:manage"),
    route("post", `/api/brand-applications/${SOME_ID}/reject`, "platform:brands:manage"),
  ],
  commissions: [
    route("get", "/api/commissions/tiers", ...COMMISSIONS_READ),
    route("post", "/api/commissions/tiers", "platform:commissions:manage"),
    route("patch", `/api/commissions/tiers/${SOME_ID}`, "platform:commissions:manage"),
    route("delete", `/api/commissions/tiers/${SOME_ID}`, "platform:commissions:manage"),
    route("get", "/api/commissions", ...COMMISSIONS_READ),
    route("post", `/api/commissions/${SOME_ID}/approve`, "platform:commissions:manage"),
    route("post", `/api/commissions/${SOME_ID}/void`, "platform:commissions:manage"),
    route("post", `/api/commissions/${SOME_ID}/mark-paid`, "platform:commissions:manage"),
    route("get", "/api/brand-payouts/commission-rules", ...COMMISSIONS_READ),
    route("post", "/api/brand-payouts/commission-rules", "platform:commissions:manage"),
    route("get", "/api/brand-payouts/gateway-fee-rates", ...COMMISSIONS_READ),
    route("post", "/api/brand-payouts/gateway-fee-rates", "platform:commissions:manage"),
    route("get", "/api/brand-payouts/exemptions", ...COMMISSIONS_READ),
    route("post", "/api/brand-payouts/exemptions", "platform:commissions:manage"),
    route(
      "patch",
      `/api/brand-payouts/exemptions/${SOME_ID}/revoke`,
      "platform:commissions:manage",
    ),
  ],
  coupons: [
    route("post", "/api/admin/coupons", "platform:coupons:manage"),
    route("get", "/api/admin/coupons", ...COUPONS_READ),
    route("get", "/api/admin/coupons/redemptions", ...COUPONS_READ),
    route("get", `/api/admin/coupons/${SOME_ID}`, ...COUPONS_READ),
    route("get", `/api/admin/coupons/${SOME_ID}/performance`, ...COUPONS_READ),
    route("patch", `/api/admin/coupons/${SOME_ID}/status`, "platform:coupons:manage"),
    route("patch", `/api/admin/coupons/${SOME_ID}/budget`, "platform:coupons:manage"),
    route("patch", `/api/admin/coupons/${SOME_ID}/approve`, "platform:coupons:manage"),
  ],
  catalog: [
    route("get", "/api/categories/admin", ...CATALOG_READ),
    route("post", "/api/categories", "platform:catalog:manage"),
    route("post", "/api/categories/reorder", "platform:catalog:manage"),
    route("patch", `/api/categories/${SOME_ID}`, "platform:catalog:manage"),
    route("get", "/api/collections/admin", ...CATALOG_READ),
    route("get", `/api/collections/admin/${SOME_ID}/products`, ...CATALOG_READ),
    route("post", "/api/collections", "platform:catalog:manage"),
    route("patch", `/api/collections/${SOME_ID}`, "platform:catalog:manage"),
    route("patch", `/api/collections/${SOME_ID}/products`, "platform:catalog:manage"),
    route("get", "/api/hero-slides/admin", ...CATALOG_READ),
    route("post", "/api/hero-slides", "platform:catalog:manage"),
    route("patch", `/api/hero-slides/${SOME_ID}`, "platform:catalog:manage"),
    route("get", "/api/product-types/admin", ...CATALOG_READ),
    route("post", "/api/product-types", "platform:catalog:manage"),
    route("post", "/api/product-types/reorder", "platform:catalog:manage"),
    route("patch", `/api/product-types/${SOME_ID}`, "platform:catalog:manage"),
    route("get", "/api/size-options/admin", ...CATALOG_READ),
    route("post", "/api/size-options", "platform:catalog:manage"),
    route("delete", `/api/size-options/${SOME_ID}`, "platform:catalog:manage"),
    route("get", "/api/products/review", ...CATALOG_READ),
    route("post", `/api/products/${SOME_ID}/approve`, "platform:catalog:manage"),
    route("post", `/api/products/${SOME_ID}/reject`, "platform:catalog:manage"),
    route("get", "/api/admin/sale/products", ...CATALOG_READ),
    route("get", `/api/admin/sale/products/${SOME_ID}/debug`, ...CATALOG_READ),
    route("get", "/api/admin/trending/products", ...CATALOG_READ),
    route("get", `/api/admin/trending/products/${SOME_ID}/debug`, ...CATALOG_READ),
    route("get", "/api/taste-preferences/popularity", ...CATALOG_READ),
  ],
  orders: [
    route("get", "/api/orders/admin", ...ORDERS_READ),
    route("get", `/api/orders/admin/${SOME_ID}`, ...ORDERS_READ),
    route("patch", `/api/orders/admin/${SOME_ID}/fulfilment`, "platform:orders:manage"),
    route("post", `/api/orders/admin/${SOME_ID}/cancel`, "platform:orders:manage"),
    route("get", "/api/delivery-zones/history", ...ORDERS_READ),
    route("post", "/api/delivery-zones", "platform:orders:manage"),
    route("patch", `/api/delivery-zones/${SOME_ID}`, "platform:orders:manage"),
    route("patch", `/api/delivery-zones/${SOME_ID}/default`, "platform:orders:manage"),
    route("delete", `/api/delivery-zones/${SOME_ID}`, "platform:orders:manage"),
  ],
  users: [
    route("post", "/api/users", "platform:users:manage"),
    route("get", "/api/users", ...USERS_READ),
    route(
      "get",
      "/api/users/search?q=zz",
      "platform:users:read",
      "platform:users:manage",
      "platform:gamification:manage",
      "platform:xp:manage",
    ),
    route("get", `/api/users/${SOME_ID}`, ...USERS_READ),
    route("post", `/api/platform/users/${SOME_ID}/suspend`, "platform:suspensions:manage"),
    route("post", `/api/platform/users/${SOME_ID}/ban`, "platform:suspensions:manage"),
    route("post", `/api/platform/users/${SOME_ID}/unsuspend`, "platform:suspensions:manage"),
    route("post", `/api/platform/users/${SOME_ID}/unban`, "platform:suspensions:manage"),
    route("post", `/api/platform/brands/${SOME_ID}/suspend`, "platform:suspensions:manage"),
    route("post", `/api/platform/brands/${SOME_ID}/unsuspend`, "platform:suspensions:manage"),
  ],
  creators: [
    route("get", "/api/creators", ...CREATORS_READ),
    route("post", `/api/creators/${SOME_ID}/approve`, "platform:creators:manage"),
    route("post", `/api/creators/${SOME_ID}/reject`, "platform:creators:manage"),
  ],
  moderation: [
    route("get", "/api/tag-reviews/metrics", "platform:reviews:moderate"),
    route("get", "/api/tag-reports/open-count", "platform:reviews:moderate"),
    route("get", "/api/tag-reports", "platform:reviews:moderate"),
    route("post", `/api/tag-reports/${SOME_ID}/resolve`, "platform:reviews:moderate"),
    route("get", "/api/content-reports/open-count", "platform:content:moderate"),
    route("get", "/api/content-reports", "platform:content:moderate"),
    route("post", `/api/content-reports/${SOME_ID}/resolve`, "platform:content:moderate"),
    route("get", "/api/creator-looks/admin", "platform:content:moderate"),
  ],
  finance: [
    route("get", "/api/admin/financial-rollup", "platform:finance:read"),
    route("get", "/api/admin/financial-rollup/ledger", "platform:finance:read"),
    route("get", "/api/admin/financial-rollup/ledger/export", "platform:finance:read"),
  ],
  support: [
    route("get", "/api/support/admin/tickets", ...SUPPORT_READ),
    route("get", `/api/support/admin/tickets/${SOME_ID}`, ...SUPPORT_READ),
    route("post", `/api/support/admin/tickets/${SOME_ID}/messages`, "platform:support:respond"),
    route("patch", `/api/support/admin/tickets/${SOME_ID}/status`, "platform:support:respond"),
    route("patch", `/api/support/admin/tickets/${SOME_ID}/assignee`, "platform:support:respond"),
    route("patch", `/api/support/admin/tickets/${SOME_ID}/priority`, "platform:support:respond"),
    route("get", "/api/support/admin/stats", "platform:support:manage"),
    route("get", "/api/support/admin/agents", ...SUPPORT_READ),
  ],
  platform: [
    route("get", "/api/platform/audit", "platform:audit:read"),
    route("get", "/api/platform/metrics/overview", "platform:metrics:read"),
    route("get", "/api/platform/metrics/activity-trend", "platform:metrics:read"),
    route("get", "/api/platform/metrics/tenants", "platform:metrics:read"),
    route("get", `/api/platform/metrics/tenants/${SOME_ID}`, "platform:metrics:read"),
    route("get", "/api/platform/features/registry", "platform:features:manage"),
    route("get", `/api/platform/features/tenants/${SOME_ID}`, "platform:features:manage"),
    route(
      "put",
      `/api/platform/features/tenants/${SOME_ID}/some.feature`,
      "platform:features:manage",
    ),
    route(
      "delete",
      `/api/platform/features/tenants/${SOME_ID}/some.feature`,
      "platform:features:manage",
    ),
    route("post", "/api/platform/impersonation", "platform:impersonate"),
    route("get", "/api/platform/impersonation/active", "platform:impersonate"),
    route("get", "/api/platform/impersonation/candidates", "platform:impersonate"),
    route("get", "/api/platform/impersonation", "platform:impersonate"),
    route("delete", `/api/platform/impersonation/${SOME_ID}`, "platform:impersonate"),
    route("get", "/api/crm/organizations", ...ORGANIZATIONS_READ),
    route("get", "/api/crm/organizations/suggest?brandId=" + OTHER_ID, ...ORGANIZATIONS_READ),
    route("post", "/api/crm/organizations", "platform:organizations:manage"),
    route("get", "/api/admin/invites", "platform:team:manage"),
    route("get", "/api/platform/permissions", "platform:team:manage"),
    route("get", "/api/platform/roles", "platform:team:manage"),
    route("get", "/api/platform/team", "platform:team:manage"),
  ],
};

const CO_FOUNDER_ONLY_ROUTES: PlatformRoute[] = [
  route("get", "/api/platform/nav-access"),
  route("put", "/api/platform/nav-access/hidden"),
  route("get", "/api/platform/nav-access/co-founders/candidates"),
  route("post", "/api/platform/nav-access/co-founders"),
  route("delete", `/api/platform/nav-access/co-founders/${SOME_ID}`),
  route("post", "/api/admin/invites"),
  route("post", "/api/platform/roles"),
  route("patch", `/api/platform/roles/${SOME_ID}`),
  route("delete", `/api/platform/roles/${SOME_ID}`),
  route("patch", `/api/platform/team/${SOME_ID}`),
  route("get", "/internal/queues"),
];

const UNRELATED_KEYS: PlatformPermissionKey[] = ["platform:audit:read", "platform:metrics:read"];

const send = (method: HttpMethod, path: string, authHeader: string) => {
  const pending = request(testApp)[method](path).set("Authorization", authHeader);
  return method === "get" || method === "delete" ? pending : pending.send({});
};

const makeCoFounder = async (userId: string): Promise<void> => {
  const platformOrganization = await crmAccessRepository.findPlatformOrganization();
  if (!platformOrganization) throw new Error("platform organization missing in fixture");
  await prisma.membership.update({
    where: { userId_organizationId: { userId, organizationId: platformOrganization.id } },
    data: { isPlatformSuperAdmin: true },
  });
};

const isRefused = (status: number): boolean => status === 401 || status === 403;

describe("platform route permissions", () => {
  it.each(Object.entries(ROUTE_GROUPS))(
    "%s routes admit exactly the roles holding a matching permission",
    async (_groupName, routes) => {
      const keysNeeded = [...new Set(routes.flatMap((platformRoute) => platformRoute.allowedKeys))];
      const sessionsByKey = new Map<PlatformPermissionKey, string>();
      for (const key of keysNeeded) {
        sessionsByKey.set(key, (await createRoleLimitedStaffSession(key)).authHeader);
      }
      const unrelatedSessions = new Map<PlatformPermissionKey, string>();
      for (const key of UNRELATED_KEYS) {
        unrelatedSessions.set(key, (await createRoleLimitedStaffSession(key)).authHeader);
      }
      const noPermissionSession = (await createRoleLimitedStaffSession()).authHeader;
      const fullAccessAdmin = (await createAdminSession()).authHeader;

      for (const { method, path, allowedKeys } of routes) {
        for (const key of allowedKeys) {
          const header = sessionsByKey.get(key);
          if (!header) throw new Error(`missing session for ${key}`);
          const response = await send(method, path, header);
          expect(
            isRefused(response.status),
            `${method.toUpperCase()} ${path} should admit a role holding only ${key}, got ${response.status}`,
          ).toBe(false);
        }

        const unrelatedKey = UNRELATED_KEYS.find((candidate) => !allowedKeys.includes(candidate));
        const unrelatedHeader = unrelatedKey ? unrelatedSessions.get(unrelatedKey) : undefined;
        if (!unrelatedHeader) throw new Error(`no unrelated session for ${path}`);
        const refusedUnrelated = await send(method, path, unrelatedHeader);
        expect(
          refusedUnrelated.status,
          `${method.toUpperCase()} ${path} should refuse a role holding only ${unrelatedKey}`,
        ).toBe(403);

        const refusedEmpty = await send(method, path, noPermissionSession);
        expect(
          refusedEmpty.status,
          `${method.toUpperCase()} ${path} should refuse a role with no platform permission`,
        ).toBe(403);

        const admittedAdmin = await send(method, path, fullAccessAdmin);
        expect(
          isRefused(admittedAdmin.status),
          `${method.toUpperCase()} ${path} should admit the built-in Admin role, got ${admittedAdmin.status}`,
        ).toBe(false);

        const anonymous = await request(testApp)[method](path);
        expect(anonymous.status, `${method.toUpperCase()} ${path} should require sign-in`).toBe(
          401,
        );
      }
    },
    120_000,
  );

  it("keeps co-founder-only routes closed to every role, even one holding every permission", async () => {
    const fullAccessAdmin = (await createAdminSession()).authHeader;
    const support = (await createRoleLimitedStaffSession("platform:support:read")).authHeader;
    const coFounder = await createAdminSession();
    await makeCoFounder(coFounder.userId);

    for (const { method, path } of CO_FOUNDER_ONLY_ROUTES) {
      const refusedAdmin = await send(method, path, fullAccessAdmin);
      expect(
        refusedAdmin.status,
        `${method.toUpperCase()} ${path} should refuse a non-co-founder with every permission`,
      ).toBe(403);

      const refusedSupport = await send(method, path, support);
      expect(refusedSupport.status, `${method.toUpperCase()} ${path} should refuse support`).toBe(
        403,
      );

      const admittedCoFounder = await send(method, path, coFounder.authHeader);
      expect(
        isRefused(admittedCoFounder.status),
        `${method.toUpperCase()} ${path} should admit a co-founder, got ${admittedCoFounder.status}`,
      ).toBe(false);
    }
  }, 120_000);
});
