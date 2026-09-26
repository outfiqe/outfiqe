import { Button, FormBanner, Skeleton } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Compass } from "lucide-react";

import {
  CRM_TOUR_REPLAY_SEARCH,
  CRM_TOUR_REPLAY_TO,
  CrmDashboardTour,
  TOUR_REPLAY_LABEL,
} from "@/features/product-tour";
import { ApiClientError } from "@/lib/apiClient";
import { getErrorMessage } from "@/lib/errorMessages";

import { crmApi } from "./api";
import { CrmOverviewSection } from "./CrmOverviewSection";
import { InviteSection } from "./InviteSection";
import { MembersSection } from "./MembersSection";
import { OwnershipTransferBanner } from "./OwnershipTransferBanner";
import { PlanGateBanner } from "./PlanGateBanner";
import type { Organization } from "./schemas";

const MEMBERS_READ_PERMISSION_KEY = "members:read";
const MEMBERS_INVITE_PERMISSION_KEY = "members:invite";
const REPORTS_READ_PERMISSION_KEY = "reports:read";
const FORBIDDEN_ERROR_CODE = "FORBIDDEN";
const NO_ORGANIZATION_ACCESS_MESSAGE =
  "You aren't a member of the CRM at this address, or your role doesn't include the CRM. If a company invited you to its CRM, open the link from your invite email, which uses that company's own address.";

const isNoOrganizationAccessError = (error: unknown): boolean =>
  error instanceof ApiClientError && error.code === FORBIDDEN_ERROR_CODE;

const canViewMembers = (organization: Organization) =>
  organization.viewerIsSuperAdmin ||
  organization.viewerPermissionKeys.includes(MEMBERS_READ_PERMISSION_KEY);

const canInviteMembers = (organization: Organization) =>
  organization.viewerIsSuperAdmin ||
  organization.viewerPermissionKeys.includes(MEMBERS_INVITE_PERMISSION_KEY);

const canViewReports = (organization: Organization) =>
  organization.viewerIsSuperAdmin ||
  organization.viewerPermissionKeys.includes(REPORTS_READ_PERMISSION_KEY);

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">CRM</h1>
          {organization && (
            <p className="text-sm text-muted-foreground">
              {organization.name} · {organization.plan}
              {organization.trialEndsAt &&
                ` · trial ends ${new Date(organization.trialEndsAt).toLocaleDateString()}`}
            </p>
          )}
        </div>
        {organization && (
          <Button asChild variant="outline" size="sm">
            <Link to={CRM_TOUR_REPLAY_TO} search={CRM_TOUR_REPLAY_SEARCH}>
              <Compass aria-hidden="true" />
              {TOUR_REPLAY_LABEL}
            </Link>
          </Button>
        )}
      </div>

      {isLoading && <Skeleton className="mt-6 h-64 w-full rounded-xl" />}
      {error && (
        <FormBanner className="mt-6">
          {isNoOrganizationAccessError(error)
            ? NO_ORGANIZATION_ACCESS_MESSAGE
            : getErrorMessage(error)}
        </FormBanner>
      )}

      {organization && (
        <div className="mt-6 space-y-8">
          <PlanGateBanner advancedFeaturesEnabled={organization.advancedFeaturesEnabled} />
          <OwnershipTransferBanner organization={organization} />

          {organization.advancedFeaturesEnabled && canViewReports(organization) && (
            <CrmOverviewSection />
          )}

          {canViewMembers(organization) || canInviteMembers(organization) ? (
            <div className="space-y-8">
              {canViewMembers(organization) && (
                <MembersSection
                  viewerIsSuperAdmin={organization.viewerIsSuperAdmin}
                  viewerPermissionKeys={organization.viewerPermissionKeys}
                  hasPendingOwnershipTransfer={organization.pendingOwnershipTransfer !== null}
                />
              )}
              {canInviteMembers(organization) && (
                <InviteSection
                  viewerIsSuperAdmin={organization.viewerIsSuperAdmin}
                  viewerPermissionKeys={organization.viewerPermissionKeys}
                />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              There&apos;s nothing here for your role yet.
            </p>
          )}

          <CrmDashboardTour organization={organization} />
        </div>
      )}
    </div>
  );
};
