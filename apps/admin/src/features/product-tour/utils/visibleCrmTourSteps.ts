import { isCrmSubItemVisible } from "@/components/AdminSidebar.utils";

import type { CrmTourStep } from "../constants/crmDashboardTour";

type CrmOrganizationContext = Parameters<typeof isCrmSubItemVisible>[1];

export const visibleCrmTourSteps = (
  steps: readonly CrmTourStep[],
  crmOrganization: CrmOrganizationContext,
): CrmTourStep[] => steps.filter((step) => isCrmSubItemVisible(step, crmOrganization));
