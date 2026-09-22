"use client";

import { Tour, type TourCloseReason } from "@outfiqe/design-system";
import type { TourOutcome } from "@outfiqe/types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/features/auth";

import {
  BRAND_DASHBOARD_TOUR_KEY,
  BRAND_DASHBOARD_TOUR_STEPS,
  BRAND_DASHBOARD_TOUR_VERSION,
  TOUR_REPLAY_QUERY_PARAM,
} from "../constants/brandDashboardTour";
import { TOUR_OUTCOME } from "../constants/tourOutcome";
import { useRecordTourOutcome } from "../hooks/useRecordTourOutcome";
import { useTourProgress } from "../hooks/useTourProgress";
import { hasSeenTour } from "../utils/hasSeenTour";

const FIRST_STEP_INDEX = 0;

const OUTCOME_BY_CLOSE_REASON: Record<TourCloseReason, TourOutcome> = {
  completed: TOUR_OUTCOME.COMPLETED,
  dismissed: TOUR_OUTCOME.DISMISSED,
};

export const BrandDashboardTour = () => {
  const { isBrandOwner } = useAuth();
  const { data: tourProgress, isSuccess: isProgressLoaded } = useTourProgress();
  const recordOutcome = useRecordTourOutcome();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [stepIndex, setStepIndex] = useState(FIRST_STEP_INDEX);
  const [isReplaying, setIsReplaying] = useState(false);
  const [hasClosedThisVisit, setHasClosedThisVisit] = useState(false);
  const [wasReplayRequested, setWasReplayRequested] = useState(false);

  const isReplayRequested = searchParams.get(TOUR_REPLAY_QUERY_PARAM) === BRAND_DASHBOARD_TOUR_KEY;
  const hasSeenCurrentVersion =
    isProgressLoaded &&
    hasSeenTour(tourProgress.tours, BRAND_DASHBOARD_TOUR_KEY, BRAND_DASHBOARD_TOUR_VERSION);
  const shouldStartAutomatically =
    isProgressLoaded && !hasSeenCurrentVersion && !hasClosedThisVisit;
  const isOpen = isBrandOwner && (isReplaying || shouldStartAutomatically);

  if (isReplayRequested !== wasReplayRequested) {
    setWasReplayRequested(isReplayRequested);
    if (isReplayRequested) {
      setStepIndex(FIRST_STEP_INDEX);
      setIsReplaying(true);
    }
  }

  useEffect(() => {
    if (isReplayRequested) router.replace(pathname);
  }, [isReplayRequested, pathname, router]);

  const closeTour = (reason: TourCloseReason) => {
    setIsReplaying(false);
    setHasClosedThisVisit(true);
    setStepIndex(FIRST_STEP_INDEX);
    if (hasSeenCurrentVersion) return;
    recordOutcome.mutate({
      tourKey: BRAND_DASHBOARD_TOUR_KEY,
      version: BRAND_DASHBOARD_TOUR_VERSION,
      outcome: OUTCOME_BY_CLOSE_REASON[reason],
    });
  };

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
