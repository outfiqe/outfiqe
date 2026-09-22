"use client";

import { Tour, type TourStep } from "@outfiqe/design-system";

import { useTourLaunch } from "../context/TourLaunchContext";

const NO_STEPS: readonly TourStep[] = [];
const FIRST_STEP_INDEX = 0;
const doNothing = () => {};

export const TourLoadingShell = () => {
  const { pendingTourHref, finishTourLoading } = useTourLaunch();

  return (
    <Tour
      steps={NO_STEPS}
      isOpen={pendingTourHref !== null}
      isLoading
      stepIndex={FIRST_STEP_INDEX}
      onStepChange={doNothing}
      onClose={finishTourLoading}
    />
  );
};
