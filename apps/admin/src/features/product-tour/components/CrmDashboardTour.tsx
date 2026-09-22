import { Tour } from "@outfiqe/design-system";

import { shouldShowCrmSection } from "@/components/AdminSidebar.utils";
import type { Organization } from "@/features/crm/schemas";

import {
  CRM_DASHBOARD_TOUR_KEY,
  CRM_DASHBOARD_TOUR_STEPS,
  CRM_DASHBOARD_TOUR_VERSION,
} from "../constants/crmDashboardTour";
import { useTourController } from "../hooks/useTourController";
import { visibleCrmTourSteps } from "../utils/visibleCrmTourSteps";

export type CrmDashboardTourProps = {
  organization: Organization;
};

export const CrmDashboardTour = ({ organization }: CrmDashboardTourProps) => {
  const isEligible = shouldShowCrmSection(organization);
  const steps = visibleCrmTourSteps(CRM_DASHBOARD_TOUR_STEPS, organization);
  const { isOpen, stepIndex, setStepIndex, closeTour } = useTourController(
    CRM_DASHBOARD_TOUR_KEY,
    CRM_DASHBOARD_TOUR_VERSION,
    isEligible,
  );

  return (
    <Tour
      steps={steps}
      isOpen={isOpen}
      stepIndex={stepIndex}
      onStepChange={setStepIndex}
      onClose={closeTour}
    />
  );
};
