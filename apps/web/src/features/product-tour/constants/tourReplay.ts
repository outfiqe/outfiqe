export const TOUR_REPLAY_QUERY_PARAM = "tour";
export const TOUR_REPLAY_LABEL = "Take the tour";

export const buildTourReplayHref = (pathname: string, tourKey: string): string =>
  `${pathname}?${TOUR_REPLAY_QUERY_PARAM}=${tourKey}`;
