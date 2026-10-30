import { ANALYTICS_EVENTS } from "@outfiqe/utils";
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useTrackView } from "./useTrackView";

const trackEvent = vi.fn();

vi.mock("../utils/analyticsClient", () => ({
  trackEvent: (...trackedEvent: unknown[]) => trackEvent(...trackedEvent),
}));

afterEach(() => {
  vi.clearAllMocks();
});

const renderLookView = (initialLookId: string) =>
  renderHook(
    ({ lookId }) =>
      useTrackView(
        ANALYTICS_EVENTS.LOOK_DETAIL_VIEW,
        { look_id: lookId, creator_id: "creator-1" },
        lookId,
      ),
    { initialProps: { lookId: initialLookId } },
  );

describe("useTrackView", () => {
  it("records one view per item, however often it re-renders", () => {
    const { rerender } = renderLookView("look-1");

    rerender({ lookId: "look-1" });
    rerender({ lookId: "look-1" });

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.LOOK_DETAIL_VIEW, {
      look_id: "look-1",
      creator_id: "creator-1",
    });
  });

  it("waits until the view is ready, then records it once", () => {
    const notReadyYet: { viewKey: string | null } = { viewKey: null };
    const { rerender } = renderHook(
      ({ viewKey }: { viewKey: string | null }) =>
        useTrackView(
          ANALYTICS_EVENTS.LOOK_DETAIL_VIEW,
          { look_id: "look-1", creator_id: "creator-1" },
          viewKey,
        ),
      { initialProps: notReadyYet },
    );
    expect(trackEvent).not.toHaveBeenCalled();

    rerender({ viewKey: "look-1" });
    rerender({ viewKey: "look-1" });
    expect(trackEvent).toHaveBeenCalledTimes(1);
  });

  it("records a new view when the item changes", () => {
    const { rerender } = renderLookView("look-1");

    rerender({ lookId: "look-2" });

    expect(trackEvent).toHaveBeenCalledTimes(2);
    expect(trackEvent).toHaveBeenLastCalledWith(ANALYTICS_EVENTS.LOOK_DETAIL_VIEW, {
      look_id: "look-2",
      creator_id: "creator-1",
    });
  });
});
