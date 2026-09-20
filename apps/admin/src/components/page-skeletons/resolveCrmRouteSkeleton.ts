import { normalizePathname } from "./resolvePageSkeletonKind";

export const CRM_ROUTE_SKELETON_KEY = {
  AUDIT: "audit",
  BILLING: "billing",
  CONTACTS: "contacts",
  CUSTOMERS: "customers",
  CUSTOMER_DETAIL: "customer-detail",
  PARTNERS: "partners",
  PARTNER_DETAIL: "partner-detail",
  PIPELINE: "pipeline",
  REPORTS: "reports",
  ROLES: "roles",
  SUPPORT: "support",
  TASKS: "tasks",
} as const;

export type CrmRouteSkeletonKey =
  (typeof CRM_ROUTE_SKELETON_KEY)[keyof typeof CRM_ROUTE_SKELETON_KEY];

const KEY_BY_PATH: Record<string, CrmRouteSkeletonKey> = {
  "/crm/audit": CRM_ROUTE_SKELETON_KEY.AUDIT,
  "/crm/billing": CRM_ROUTE_SKELETON_KEY.BILLING,
  "/crm/contacts": CRM_ROUTE_SKELETON_KEY.CONTACTS,
  "/crm/customers": CRM_ROUTE_SKELETON_KEY.CUSTOMERS,
  "/crm/partners": CRM_ROUTE_SKELETON_KEY.PARTNERS,
  "/crm/pipeline": CRM_ROUTE_SKELETON_KEY.PIPELINE,
  "/crm/reports": CRM_ROUTE_SKELETON_KEY.REPORTS,
  "/crm/roles": CRM_ROUTE_SKELETON_KEY.ROLES,
  "/crm/support": CRM_ROUTE_SKELETON_KEY.SUPPORT,
  "/crm/tasks": CRM_ROUTE_SKELETON_KEY.TASKS,
};

const KEY_BY_PATH_PATTERN: readonly { pattern: RegExp; key: CrmRouteSkeletonKey }[] = [
  { pattern: /^\/crm\/customers\/[^/]+$/, key: CRM_ROUTE_SKELETON_KEY.CUSTOMER_DETAIL },
  { pattern: /^\/crm\/partners\/[^/]+$/, key: CRM_ROUTE_SKELETON_KEY.PARTNER_DETAIL },
];

export const resolveCrmRouteSkeletonKey = (pathname: string): CrmRouteSkeletonKey | null => {
  const normalizedPathname = normalizePathname(pathname);
  const keyForExactPath = KEY_BY_PATH[normalizedPathname];
  if (keyForExactPath) return keyForExactPath;

  const matchedPattern = KEY_BY_PATH_PATTERN.find(({ pattern }) =>
    pattern.test(normalizedPathname),
  );
  return matchedPattern?.key ?? null;
};
