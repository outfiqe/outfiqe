import { FormBanner } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";

import { getErrorMessage } from "@/lib/errorMessages";

import { crmApi } from "./api";
import { CRM_PAGE_TEXT } from "./crmPageContent";
import { RolesSection } from "./RolesSection";
import { RoleListSkeleton } from "./skeletons";

export const RolesPage = () => {
  const {
    data: organization,
    isLoading,
    error,
  } = useQuery({ queryKey: ["crm-organization"], queryFn: crmApi.getOrganization });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">
        {CRM_PAGE_TEXT.roles.title}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{CRM_PAGE_TEXT.roles.description}</p>

      <div className="mt-6">
        {isLoading && <RoleListSkeleton />}

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
