import { FormBanner } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";

import { getErrorMessage } from "@/lib/errorMessages";

import { crmApi } from "../../api/crmApi";
import { CrmPageHeader } from "../../components/CrmPageHeader";
import { RoleListSkeleton } from "../../components/CrmSkeletons";
import { CRM_PAGE_TEXT } from "../../constants/crmPageContent";
import { RolesSection } from "./RolesSection";

export const RolesPage = () => {
  const {
    data: organization,
    isLoading,
    error,
  } = useQuery({ queryKey: ["crm-organization"], queryFn: crmApi.getOrganization });

  return (
    <div>
      <CrmPageHeader {...CRM_PAGE_TEXT.roles} />

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
