import { buildTenantOrigin } from "./tenantHost";

export const IMPERSONATION_CODE_QUERY_PARAM = "impersonation_code";

export const buildImpersonationHandoffUrl = (tenantSubdomain: string, code: string): string => {
  const url = new URL(`${buildTenantOrigin(tenantSubdomain)}/admin/crm`);
  url.searchParams.set(IMPERSONATION_CODE_QUERY_PARAM, code);
  return url.toString();
};
