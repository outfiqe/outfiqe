import { isTenantHost } from "@outfiqe/utils";

const TENANT_BASE_DOMAIN = import.meta.env.VITE_TENANT_BASE_DOMAIN ?? "localhost";

export const isOnTenantHost = (): boolean =>
  isTenantHost(window.location.hostname, TENANT_BASE_DOMAIN);

export const buildTenantOrigin = (subdomain: string): string => {
  const port = window.location.port ? `:${window.location.port}` : "";
  return `${window.location.protocol}//${subdomain}.${TENANT_BASE_DOMAIN}${port}`;
};
