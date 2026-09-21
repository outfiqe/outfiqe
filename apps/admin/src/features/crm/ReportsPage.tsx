import { useQuery } from "@tanstack/react-query";

import { crmApi } from "./api";
import { CRM_PAGE_TEXT } from "./crmPageContent";
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
        <PlanGateBanner advancedFeaturesEnabled={organization.advancedFeaturesEnabled} />
      )}

      <h1 className="font-display text-2xl font-bold text-foreground">
        {CRM_PAGE_TEXT.reports.title}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{CRM_PAGE_TEXT.reports.description}</p>

      <div className="mt-6">
        <ReportsSection />
      </div>
    </div>
  );
};
