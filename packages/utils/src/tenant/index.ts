export const TENANT_SUBDOMAIN_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export const RESERVED_TENANT_SUBDOMAINS = [
  "www",
  "api",
  "admin",
  "app",
  "mail",
  "ftp",
  "staging",
  "localhost",
  "crm",
];

export const extractTenantSubdomain = (hostHeader: string, baseDomain: string): string | null => {
  const host = (hostHeader.split(":").at(0) ?? "").toLowerCase();
  const base = baseDomain.toLowerCase();

  if (host === base || !host.endsWith(`.${base}`)) return null;

  const candidate = host.slice(0, host.length - base.length - 1);
  if (!TENANT_SUBDOMAIN_REGEX.test(candidate) || RESERVED_TENANT_SUBDOMAINS.includes(candidate)) {
    return null;
  }

  return candidate;
};

export const isTenantHost = (hostHeader: string, baseDomain: string): boolean =>
  extractTenantSubdomain(hostHeader, baseDomain) !== null;
