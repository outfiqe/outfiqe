"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type TourLaunch = {
  readonly pendingTourHref: string | null;
  readonly startTourLoading: (href: string) => void;
  readonly finishTourLoading: () => void;
};

const TOUR_LOADING_STUCK_TIMEOUT_MS = 6000;

const TourLaunchContext = createContext<TourLaunch>({
  pendingTourHref: null,
  startTourLoading: () => {},
  finishTourLoading: () => {},
});

export const TourLaunchProvider = ({ children }: { children: ReactNode }) => {
  const [pendingTourHref, setPendingTourHref] = useState<string | null>(null);
  const stuckTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const startTourLoading = useCallback((href: string) => {
    clearTimeout(stuckTimeoutRef.current);
    setPendingTourHref(href);
    stuckTimeoutRef.current = setTimeout(
      () => setPendingTourHref(null),
      TOUR_LOADING_STUCK_TIMEOUT_MS,
    );
  }, []);

  const finishTourLoading = useCallback(() => {
    clearTimeout(stuckTimeoutRef.current);
    setPendingTourHref(null);
  }, []);

  useEffect(() => () => clearTimeout(stuckTimeoutRef.current), []);

  const value = useMemo<TourLaunch>(
    () => ({ pendingTourHref, startTourLoading, finishTourLoading }),
    [pendingTourHref, startTourLoading, finishTourLoading],
  );

  return <TourLaunchContext.Provider value={value}>{children}</TourLaunchContext.Provider>;
};

export const useTourLaunch = (): TourLaunch => useContext(TourLaunchContext);
