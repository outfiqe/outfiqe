"use client";

import { Tour } from "@outfiqe/design-system";

import { useAuth } from "@/features/auth";

import {
  CREATOR_DASHBOARD_TOUR_KEY,
  CREATOR_DASHBOARD_TOUR_STEPS,
  CREATOR_DASHBOARD_TOUR_VERSION,
} from "../constants/creatorDashboardTour";
import { useTourController } from "../hooks/useTourController";

export const CreatorDashboardTour = () => {
  const { isCreator } = useAuth();
  const { isOpen, stepIndex, setStepIndex, closeTour } = useTourController(
    CREATOR_DASHBOARD_TOUR_KEY,
    CREATOR_DASHBOARD_TOUR_VERSION,
    isCreator,
  );

  return (
    <Tour
      steps={CREATOR_DASHBOARD_TOUR_STEPS}
      isOpen={isOpen}
      stepIndex={stepIndex}
      onStepChange={setStepIndex}
      onClose={closeTour}
    />
  );
};
