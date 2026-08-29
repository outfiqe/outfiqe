import { FormBanner } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";

import { ApiClientError } from "@/lib/apiClient";
import { getErrorMessage } from "@/lib/errorMessages";

import { crmApi } from "./api";
import { CrmTabs } from "./CrmTabs";
import { InviteSection } from "./InviteSection";
import { MembersSection } from "./MembersSection";
import { OwnershipTransferBanner } from "./OwnershipTransferBanner";
import { PlanGateBanner } from "./PlanGateBanner";
import type { Organization } from "./schemas";

const MEMBERS_READ_PERMISSION_KEY = "members:read";
const MEMBERS_INVITE_PERMISSION_KEY = "members:invite";
const FORBIDDEN_ERROR_CODE = "FORBIDDEN";
const NO_ORGANIZATION_ACCESS_MESSAGE =
  "You don't have CRM access on this organization. If you were invited to a different organization, make sure you're on that organization's own subdomain.";

const isNoOrganizationAccessError = (error: unknown): boolean =>
  error instanceof ApiClientError && error.code === FORBIDDEN_ERROR_CODE;

const canViewMembers = (organization: Organization) =>
  organization.viewerIsSuperAdmin ||
  organization.viewerPermissionKeys.includes(MEMBERS_READ_PERMISSION_KEY);

const canInviteMembers = (organization: Organization) =>
  organization.viewerIsSuperAdmin ||
  organization.viewerPermissionKeys.includes(MEMBERS_INVITE_PERMISSION_KEY);

export const CrmPage = () => {
  const {
    data: organization,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["crm-organization"],
    queryFn: crmApi.getOrganization,
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">CRM</h1>
        {organization && (
          <p className="text-sm text-muted-foreground">
            {organization.name} · {organization.plan}
            {organization.trialEndsAt &&
              ` · trial ends ${new Date(organization.trialEndsAt).toLocaleDateString()}`}
          </p>
        )}
      </div>

      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}
      {error && (
        <FormBanner className="mt-6">
          {isNoOrganizationAccessError(error)
            ? NO_ORGANIZATION_ACCESS_MESSAGE
            : getErrorMessage(error)}
        </FormBanner>
      )}

      {organization && (
        <div className="mt-6">
          <CrmTabs
            viewerIsSuperAdmin={organization.viewerIsSuperAdmin}
            viewerPermissionKeys={organization.viewerPermissionKeys}
          />
          <PlanGateBanner advancedFeaturesEnabled={organization.advancedFeaturesEnabled} />
          <OwnershipTransferBanner organization={organization} />

          {canViewMembers(organization) || canInviteMembers(organization) ? (
            <div className="space-y-8">
              {canViewMembers(organization) && (
                <MembersSection
                  viewerIsSuperAdmin={organization.viewerIsSuperAdmin}
                  hasPendingOwnershipTransfer={organization.pendingOwnershipTransfer !== null}
                />
              )}
              {canInviteMembers(organization) && <InviteSection />}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              There&apos;s nothing here for your role yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
