import { RESERVED_TENANT_SUBDOMAINS } from "@outfiqe/utils";

export const isOnReservedTenantSubdomain = (url: string, tenantBaseDomain: string): boolean => {
  const { hostname } = new URL(url);
  const baseDomain = tenantBaseDomain.toLowerCase();
  return RESERVED_TENANT_SUBDOMAINS.some(
    (reservedSubdomain) => hostname.toLowerCase() === `${reservedSubdomain}.${baseDomain}`,
  );
};
