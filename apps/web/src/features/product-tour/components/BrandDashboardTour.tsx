"use client";

import { Tour } from "@outfiqe/design-system";

import { useAuth } from "@/features/auth";

import {
  BRAND_DASHBOARD_TOUR_KEY,
  BRAND_DASHBOARD_TOUR_STEPS,
  BRAND_DASHBOARD_TOUR_VERSION,
} from "../constants/brandDashboardTour";
import { useTourController } from "../hooks/useTourController";

export const BrandDashboardTour = () => {
  const { isBrandOwner } = useAuth();
  const { isOpen, stepIndex, setStepIndex, closeTour } = useTourController(
    BRAND_DASHBOARD_TOUR_KEY,
    BRAND_DASHBOARD_TOUR_VERSION,
    isBrandOwner,
  );

  return (
    <Tour
      steps={BRAND_DASHBOARD_TOUR_STEPS}
      isOpen={isOpen}
      stepIndex={stepIndex}
      onStepChange={setStepIndex}
      onClose={closeTour}
    />
  );
};
