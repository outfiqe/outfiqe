import { FormBanner } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";

import { getErrorMessage } from "@/lib/errorMessages";

import { crmApi } from "./api";
import { CrmTabs } from "./CrmTabs";
import { RolesSection } from "./RolesSection";

export const RolesPage = () => {
  const {
    data: organization,
    isLoading,
    error,
  } = useQuery({ queryKey: ["crm-organization"], queryFn: crmApi.getOrganization });

  return (
    <div>
      {organization && (
        <CrmTabs
          viewerIsSuperAdmin={organization.viewerIsSuperAdmin}
          viewerPermissionKeys={organization.viewerPermissionKeys}
        />
      )}

      <h1 className="font-display text-2xl font-bold text-foreground">Roles &amp; settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Build custom roles from the permission catalog and rename this organization.
      </p>

      <div className="mt-6">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <FormBanner>{getErrorMessage(error)}</FormBanner>}
        {organization && (
          <RolesSection
            organizationName={organization.name}
            viewerIsSuperAdmin={organization.viewerIsSuperAdmin}
            viewerPermissionKeys={organization.viewerPermissionKeys}
          />
        )}
      </div>
    </div>
  );
};
