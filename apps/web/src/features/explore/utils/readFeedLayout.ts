import { EXPLORE_QUERY_PARAM, FEED_LAYOUT, type FeedLayout } from "../constants/explore.constants";

type ReadableSearchParams = { get: (name: string) => string | null };

export const toFeedLayout = (value: string | null | undefined): FeedLayout =>
  value === FEED_LAYOUT.LIST ? FEED_LAYOUT.LIST : FEED_LAYOUT.GRID;

export const readFeedLayout = (searchParams: ReadableSearchParams): FeedLayout =>
  toFeedLayout(searchParams.get(EXPLORE_QUERY_PARAM.LAYOUT));
