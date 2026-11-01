import { ANALYTICS_EVENTS } from "@outfiqe/utils";
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useTrackSearchResults } from "./useTrackSearchResults";

const trackEvent = vi.fn();

vi.mock("@/features/analytics/utils/analyticsClient", () => ({
  trackEvent: (...trackedEvent: unknown[]) => trackEvent(...trackedEvent),
}));

afterEach(() => {
  vi.clearAllMocks();
});

type SearchState = { query: string; resultCount: number | null };

const renderSearch = (initialSearch: SearchState) =>
  renderHook(
    ({ query, resultCount }: SearchState) => useTrackSearchResults("products", query, resultCount),
    { initialProps: initialSearch },
  );

describe("useTrackSearchResults", () => {
  it("waits for the results, then records the search once with a tidied query", () => {
    const { rerender } = renderSearch({ query: "  Red Kurta ", resultCount: null });
    expect(trackEvent).not.toHaveBeenCalled();

    rerender({ query: "  Red Kurta ", resultCount: 12 });
    rerender({ query: "  Red Kurta ", resultCount: 12 });

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.SEARCH_QUERY_SUBMIT, {
      search_scope: "products",
      search_query: "red kurta",
      result_count: 12,
      is_zero_result: false,
    });
  });

  it("flags a search that found nothing", () => {
    renderSearch({ query: "velvet saree", resultCount: 0 });

    expect(trackEvent).toHaveBeenCalledWith(
      ANALYTICS_EVENTS.SEARCH_QUERY_SUBMIT,
      expect.objectContaining({ result_count: 0, is_zero_result: true }),
    );
  });

  it("records a new search when the query changes", () => {
    const { rerender } = renderSearch({ query: "kurta", resultCount: 4 });

    rerender({ query: "jacket", resultCount: 9 });

    expect(trackEvent).toHaveBeenCalledTimes(2);
  });
});
