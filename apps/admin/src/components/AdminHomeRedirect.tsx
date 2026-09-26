import { Navigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { useAuth } from "@/features/auth/AuthContext";
import { buildTenantOrigin, isOnTenantHost } from "@/lib/tenantHost";

import { resolveAdminLanding } from "./adminLanding";
import { NoSectionAccess } from "./NoSectionAccess";

const TENANT_CRM_PATH = "/admin/crm";

export const AdminHomeRedirect = () => {
  const { state } = useAuth();
  const landing =
    state.status === "signed-in" ? resolveAdminLanding(state.user, isOnTenantHost()) : null;
  const tenantSubdomain = landing?.kind === "tenant" ? landing.subdomain : null;

  useEffect(() => {
    if (!tenantSubdomain) return;
    window.location.replace(`${buildTenantOrigin(tenantSubdomain)}${TENANT_CRM_PATH}`);
  }, [tenantSubdomain]);

  if (!landing) return null;
  if (landing.kind === "route") return <Navigate href={landing.href} replace />;
  if (landing.kind === "no-sections") return <NoSectionAccess homeHref={null} />;

  return (
    <p role="status" className="text-sm text-muted-foreground">
      Taking you to your organization…
    </p>
  );
};
