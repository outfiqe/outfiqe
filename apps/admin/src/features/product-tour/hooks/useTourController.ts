import type { TourCloseReason } from "@outfiqe/design-system";
import type { TourKey, TourOutcome } from "@outfiqe/types";
import { useEffect, useState } from "react";

import { oneOfFilter, useSearchFilter } from "@/lib/useSearchFilter";

import { TOUR_OUTCOME } from "../constants/tourOutcome";
import { hasSeenTour } from "../utils/hasSeenTour";
import { useRecordTourOutcome } from "./useRecordTourOutcome";
import { useTourProgress } from "./useTourProgress";

const FIRST_STEP_INDEX = 0;
const NOT_REPLAYING_VALUE = "";

const OUTCOME_BY_CLOSE_REASON: Record<TourCloseReason, TourOutcome> = {
  completed: TOUR_OUTCOME.COMPLETED,
  dismissed: TOUR_OUTCOME.DISMISSED,
};

export type TourController = {
  isOpen: boolean;
  stepIndex: number;
  setStepIndex: (nextStepIndex: number) => void;
  closeTour: (reason: TourCloseReason) => void;
};

export const useTourController = (
  tourKey: TourKey,
  version: number,
  isEligible: boolean,
): TourController => {
  const { data: tourProgress, isSuccess: isProgressLoaded } = useTourProgress();
  const recordOutcome = useRecordTourOutcome();
  const [requestedTourKey, setRequestedTourKey] = useSearchFilter(
    "tour",
    oneOfFilter([tourKey], NOT_REPLAYING_VALUE),
  );
  const [stepIndex, setStepIndex] = useState(FIRST_STEP_INDEX);
  const [isReplaying, setIsReplaying] = useState(false);
  const [hasClosedThisVisit, setHasClosedThisVisit] = useState(false);
  const [wasReplayRequested, setWasReplayRequested] = useState(false);

  const isReplayRequested = requestedTourKey === tourKey;
  const hasSeenCurrentVersion =
    isProgressLoaded && hasSeenTour(tourProgress.tours, tourKey, version);
  const shouldStartAutomatically =
    isProgressLoaded && !hasSeenCurrentVersion && !hasClosedThisVisit;
  const isOpen = isEligible && (isReplaying || shouldStartAutomatically);

  if (isReplayRequested !== wasReplayRequested) {
    setWasReplayRequested(isReplayRequested);
    if (isReplayRequested) {
      setStepIndex(FIRST_STEP_INDEX);
      setIsReplaying(true);
    }
  }

  useEffect(() => {
    if (isReplayRequested) setRequestedTourKey(NOT_REPLAYING_VALUE);
  }, [isReplayRequested, setRequestedTourKey]);

  const closeTour = (reason: TourCloseReason) => {
    setIsReplaying(false);
    setHasClosedThisVisit(true);
    setStepIndex(FIRST_STEP_INDEX);
    if (hasSeenCurrentVersion) return;
    recordOutcome.mutate({ tourKey, version, outcome: OUTCOME_BY_CLOSE_REASON[reason] });
  };

  return { isOpen, stepIndex, setStepIndex, closeTour };
};
