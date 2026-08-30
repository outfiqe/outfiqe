import { isTenantHost } from "@outfiqe/utils";

const TENANT_BASE_DOMAIN = import.meta.env.VITE_TENANT_BASE_DOMAIN ?? "localhost";

export const isOnTenantHost = (): boolean =>
  isTenantHost(window.location.hostname, TENANT_BASE_DOMAIN);
