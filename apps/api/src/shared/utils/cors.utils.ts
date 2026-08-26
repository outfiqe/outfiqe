export const isTenantOrigin = (origin: string, baseDomain: string): boolean => {
  let hostname: string;
  try {
    ({ hostname } = new URL(origin));
  } catch {
    return false;
  }

  const host = hostname.toLowerCase();
  const base = baseDomain.toLowerCase();
  return host === base || host.endsWith(`.${base}`);
};

export const isAllowedOrigin = (
  origin: string | undefined,
  allowedOrigins: string[],
  tenantBaseDomain: string,
): boolean =>
  !origin || allowedOrigins.includes(origin) || isTenantOrigin(origin, tenantBaseDomain);
