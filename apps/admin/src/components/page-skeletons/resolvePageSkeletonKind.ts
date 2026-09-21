export const PAGE_SKELETON_KIND = {
  DASHBOARD: "dashboard",
  LIST: "list",
  KANBAN: "kanban",
  DETAIL_FORM: "detail-form",
  GENERIC: "generic",
} as const;

export type PageSkeletonKind = (typeof PAGE_SKELETON_KIND)[keyof typeof PAGE_SKELETON_KIND];

const ADMIN_BASE_PATH = "/admin";

const DASHBOARD_PATHS = new Set([
  "/platform",
  "/platform/metrics",
  "/crm",
  "/crm/reports",
  "/financial-rollup",
  "/gamification",
]);

const DASHBOARD_PATH_PATTERNS = [/^\/platform\/metrics\/[^/]+$/];

const KANBAN_PATHS = new Set(["/crm/pipeline"]);

const DETAIL_FORM_PATHS = new Set([
  "/profile",
  "/withdraw-policy",
  "/platform-commission",
  "/platform/nav-access",
  "/crm/billing",
  "/gamification/badges/new",
]);

const DETAIL_FORM_PATH_PATTERNS = [
  /^\/orders\/[^/]+$/,
  /^\/support\/[^/]+$/,
  /^\/crm\/customers\/[^/]+$/,
  /^\/crm\/partners\/[^/]+$/,
  /^\/crm\/billing\/return\/[^/]+$/,
  /^\/gamification\/badges\/[^/]+\/edit$/,
];

const LIST_PATHS = new Set([
  "/announcements",
  "/categories",
  "/collections",
  "/commissions",
  "/content-browser",
  "/content-reports",
  "/coupons",
  "/creators",
  "/crm/audit",
  "/crm/contacts",
  "/crm/customers",
  "/crm/partners",
  "/crm/roles",
  "/crm/support",
  "/crm/tasks",
  "/delivery-zones",
  "/gamification/badges",
  "/gamification/leaderboards",
  "/gamification/manual-actions",
  "/gamification/xp-levels",
  "/hero-slides",
  "/orders",
  "/organizations",
  "/platform/brand-applications",
  "/platform/features",
  "/platform/impersonation",
  "/product-reviews",
  "/product-types",
  "/products",
  "/size-options",
  "/support",
  "/tag-reports",
  "/tag-reviews",
  "/trending",
  "/users",
  "/withdraw-requests",
]);

export const normalizePathname = (pathname: string): string => {
  const withoutBasePath = pathname.startsWith(ADMIN_BASE_PATH)
    ? pathname.slice(ADMIN_BASE_PATH.length)
    : pathname;
  const withoutTrailingSlash = withoutBasePath.replace(/\/+$/, "");
  return withoutTrailingSlash === "" ? "/" : withoutTrailingSlash;
};

const matchesAnyPattern = (pathname: string, patterns: RegExp[]): boolean =>
  patterns.some((pattern) => pattern.test(pathname));

export const resolvePageSkeletonKind = (pathname: string): PageSkeletonKind => {
  const normalizedPathname = normalizePathname(pathname);

  if (
    DASHBOARD_PATHS.has(normalizedPathname) ||
    matchesAnyPattern(normalizedPathname, DASHBOARD_PATH_PATTERNS)
  ) {
    return PAGE_SKELETON_KIND.DASHBOARD;
  }
  if (KANBAN_PATHS.has(normalizedPathname)) return PAGE_SKELETON_KIND.KANBAN;
  if (
    DETAIL_FORM_PATHS.has(normalizedPathname) ||
    matchesAnyPattern(normalizedPathname, DETAIL_FORM_PATH_PATTERNS)
  ) {
    return PAGE_SKELETON_KIND.DETAIL_FORM;
  }
  if (LIST_PATHS.has(normalizedPathname)) return PAGE_SKELETON_KIND.LIST;
  return PAGE_SKELETON_KIND.GENERIC;
};
