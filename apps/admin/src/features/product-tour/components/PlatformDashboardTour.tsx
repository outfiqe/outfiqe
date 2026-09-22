import { Tour } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";

import { shouldShowPlatformSection } from "@/components/AdminSidebar.utils";
import { useAuth } from "@/features/auth/AuthContext";
import { crmApi } from "@/features/crm/api";

import {
  PLATFORM_DASHBOARD_TOUR_KEY,
  PLATFORM_DASHBOARD_TOUR_STEPS,
  PLATFORM_DASHBOARD_TOUR_VERSION,
} from "../constants/platformDashboardTour";
import { useTourController } from "../hooks/useTourController";
import { visiblePlatformTourSteps } from "../utils/visiblePlatformTourSteps";

export const PlatformDashboardTour = () => {
  const { state } = useAuth();
  const { data: crmOrganization } = useQuery({
    queryKey: ["crm-organization"],
    queryFn: crmApi.getOrganization,
    retry: false,
  });

  const user = state.status === "signed-in" ? state.user : null;
  const isEligible = shouldShowPlatformSection(user?.hasPlatformAccess ?? false, crmOrganization);
  const steps = visiblePlatformTourSteps(PLATFORM_DASHBOARD_TOUR_STEPS, {
    isCoFounder: user?.isCoFounder ?? false,
    hiddenNavKeys: user?.hiddenPlatformNavKeys ?? [],
  });
  const { isOpen, stepIndex, setStepIndex, closeTour } = useTourController(
    PLATFORM_DASHBOARD_TOUR_KEY,
    PLATFORM_DASHBOARD_TOUR_VERSION,
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
