import { normalizePathname } from "./resolvePageSkeletonKind";

export const DETAIL_ROUTE_SKELETON_KEY = {
  ORDER: "order",
  SUPPORT_TICKET: "support-ticket",
  TENANT_METRICS: "tenant-metrics",
  BADGE_FORM: "badge-form",
} as const;

export type DetailRouteSkeletonKey =
  (typeof DETAIL_ROUTE_SKELETON_KEY)[keyof typeof DETAIL_ROUTE_SKELETON_KEY];

const KEY_BY_PATH_PATTERN: readonly { pattern: RegExp; key: DetailRouteSkeletonKey }[] = [
  { pattern: /^\/orders\/[^/]+$/, key: DETAIL_ROUTE_SKELETON_KEY.ORDER },
  { pattern: /^\/support\/[^/]+$/, key: DETAIL_ROUTE_SKELETON_KEY.SUPPORT_TICKET },
  { pattern: /^\/platform\/metrics\/[^/]+$/, key: DETAIL_ROUTE_SKELETON_KEY.TENANT_METRICS },
  { pattern: /^\/gamification\/badges\/new$/, key: DETAIL_ROUTE_SKELETON_KEY.BADGE_FORM },
  { pattern: /^\/gamification\/badges\/[^/]+\/edit$/, key: DETAIL_ROUTE_SKELETON_KEY.BADGE_FORM },
];

export const resolveDetailRouteSkeletonKey = (pathname: string): DetailRouteSkeletonKey | null => {
  const normalizedPathname = normalizePathname(pathname);
  return KEY_BY_PATH_PATTERN.find(({ pattern }) => pattern.test(normalizedPathname))?.key ?? null;
};
