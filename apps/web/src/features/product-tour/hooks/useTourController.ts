"use client";

import type { TourCloseReason } from "@outfiqe/design-system";
import type { TourKey, TourOutcome } from "@outfiqe/types";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { TOUR_OUTCOME } from "../constants/tourOutcome";
import { TOUR_REPLAY_QUERY_PARAM } from "../constants/tourReplay";
import { useTourLaunch } from "../context/TourLaunchContext";
import { hasSeenTour } from "../utils/hasSeenTour";
import { useRecordTourOutcome } from "./useRecordTourOutcome";
import { useTourProgress } from "./useTourProgress";

const FIRST_STEP_INDEX = 0;

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
  const { finishTourLoading } = useTourLaunch();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [stepIndex, setStepIndex] = useState(FIRST_STEP_INDEX);
  const [isReplaying, setIsReplaying] = useState(false);
  const [hasClosedThisVisit, setHasClosedThisVisit] = useState(false);
  const [wasReplayRequested, setWasReplayRequested] = useState(false);

  const isReplayRequested = searchParams.get(TOUR_REPLAY_QUERY_PARAM) === tourKey;
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
    if (!isReplayRequested) return;
    const remainingParams = new URLSearchParams(searchParams);
    remainingParams.delete(TOUR_REPLAY_QUERY_PARAM);
    const query = remainingParams.toString();
    window.history.replaceState(null, "", `${pathname}${query ? `?${query}` : ""}`);
  }, [isReplayRequested, pathname, searchParams]);

  useEffect(() => {
    if (isOpen) finishTourLoading();
  }, [isOpen, finishTourLoading]);

  const closeTour = (reason: TourCloseReason) => {
    setIsReplaying(false);
    setHasClosedThisVisit(true);
    setStepIndex(FIRST_STEP_INDEX);
    if (hasSeenCurrentVersion) return;
    recordOutcome.mutate({ tourKey, version, outcome: OUTCOME_BY_CLOSE_REASON[reason] });
  };

  return { isOpen, stepIndex, setStepIndex, closeTour };
};
