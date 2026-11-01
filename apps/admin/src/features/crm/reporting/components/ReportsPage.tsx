import { useQuery } from "@tanstack/react-query";

import { crmApi } from "../../api/crmApi";
import { PlanGateBanner } from "../../billing/components/PlanGateBanner";
import { CrmPageHeader } from "../../components/CrmPageHeader";
import { CRM_PAGE_TEXT } from "../../constants/crmPageContent";
import { ReportPeriodSummary } from "./ReportPeriodSummary";
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

      <CrmPageHeader {...CRM_PAGE_TEXT.reports} />

      <div className="mt-6 space-y-6">
        <ReportPeriodSummary />
        <ReportsSection />
      </div>
    </div>
  );
};
