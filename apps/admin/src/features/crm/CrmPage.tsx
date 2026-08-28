import { FormBanner } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";

import { getErrorMessage } from "@/lib/errorMessages";

import { crmApi } from "./api";
import { InviteSection } from "./InviteSection";
import { MembersSection } from "./MembersSection";
import type { Organization } from "./schemas";

const MEMBERS_READ_PERMISSION_KEY = "members:read";
const MEMBERS_INVITE_PERMISSION_KEY = "members:invite";

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
      {error && <FormBanner className="mt-6">{getErrorMessage(error)}</FormBanner>}

      {organization &&
        (canViewMembers(organization) || canInviteMembers(organization) ? (
          <div className="mt-6 space-y-8">
            {canViewMembers(organization) && <MembersSection />}
            {canInviteMembers(organization) && <InviteSection />}
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">
            There&apos;s nothing here for your role yet.
          </p>
        ))}
    </div>
  );
};
