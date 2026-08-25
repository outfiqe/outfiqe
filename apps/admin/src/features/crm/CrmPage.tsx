import { FormBanner } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";

import { getErrorMessage } from "@/lib/errorMessages";

import { crmApi } from "./api";
import { InviteSection } from "./InviteSection";
import { MembersSection } from "./MembersSection";

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

      {organization && (
        <div className="mt-6 space-y-8">
          <MembersSection />
          <InviteSection />
        </div>
      )}
    </div>
  );
};
