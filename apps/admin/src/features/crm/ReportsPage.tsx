import { useQuery } from "@tanstack/react-query";

import { crmApi } from "./api";
import { CrmTabs } from "./CrmTabs";
import { PlanGateBanner } from "./PlanGateBanner";
import { ReportsSection } from "./ReportsSection";

export const ReportsPage = () => {
  const { data: organization } = useQuery({
    queryKey: ["crm-organization"],
    queryFn: crmApi.getOrganization,
  });

  return (
    <div>
      {organization && (
        <>
          <CrmTabs
            viewerIsSuperAdmin={organization.viewerIsSuperAdmin}
            viewerPermissionKeys={organization.viewerPermissionKeys}
          />
          <PlanGateBanner advancedFeaturesEnabled={organization.advancedFeaturesEnabled} />
        </>
      )}

      <h1 className="font-display text-2xl font-bold text-foreground">Reports</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pipeline value and support-ticket health for this organization.
      </p>

      <div className="mt-6">
        <ReportsSection />
      </div>
    </div>
  );
};
