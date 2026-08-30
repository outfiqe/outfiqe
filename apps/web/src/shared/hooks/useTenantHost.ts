"use client";

import { isTenantHost } from "@outfiqe/utils";
import { useState } from "react";

const TENANT_BASE_DOMAIN = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN ?? "localhost";

const detectTenantHost = (): boolean =>
  typeof window !== "undefined" && isTenantHost(window.location.hostname, TENANT_BASE_DOMAIN);

export const useTenantHost = (): boolean => {
  const [isOnTenantHost] = useState(detectTenantHost);
  return isOnTenantHost;
};
