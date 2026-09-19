import { FormBanner } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";

import { CardRowSkeleton } from "@/components/CardRowSkeleton";
import { getErrorMessage } from "@/lib/errorMessages";

import { crmApi } from "./api";
import { RolesSection } from "./RolesSection";

const ROLE_SKELETON_COUNT = 3;

export const RolesPage = () => {
  const {
    data: organization,
    isLoading,
    error,
  } = useQuery({ queryKey: ["crm-organization"], queryFn: crmApi.getOrganization });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Roles &amp; settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Build custom roles from the permission catalog and rename this organization.
      </p>

      <div className="mt-6">
        {isLoading && (
          <div className="space-y-3" role="status" aria-label="Loading">
            {Array.from({ length: ROLE_SKELETON_COUNT }, (_unused, roleIndex) => (
              <CardRowSkeleton
                key={roleIndex}
                textLineCount={1}
                actions={[
                  { label: "Edit", size: "sm" },
                  { label: "Delete", size: "sm" },
                ]}
              />
            ))}
          </div>
        )}
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
