import { ANALYTICS_EVENTS } from "@outfiqe/utils";
import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { usePublishBuildLook } from "./useBuildLook";

const trackEvent = vi.fn();
const publishLook = vi.fn();

vi.mock("@/features/analytics/utils/analyticsClient", () => ({
  trackEvent: (...trackedEvent: unknown[]) => trackEvent(...trackedEvent),
}));

vi.mock("../../api/outfitApi", () => ({
  outfitApi: { publishLook: (...publication: unknown[]) => publishLook(...publication) },
}));

const festivalLook = {
  imageUrls: ["https://cdn.outfiqe.test/look.jpg"],
  caption: "Festival fit",
  sizesWorn: [],
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("usePublishBuildLook analytics", () => {
  it("records a published build once the look is created", async () => {
    publishLook.mockResolvedValue({ look: { id: "look-1" } });
    const { result } = renderHook(() => usePublishBuildLook("build-1"), {
      wrapper: createQueryClientWrapper(),
    });

    await act(() => result.current.mutateAsync(festivalLook));

    expect(trackEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.OUTFIT_BUILD_PUBLISH, {
      build_id: "build-1",
    });
  });

  it("records nothing when publishing fails", async () => {
    publishLook.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => usePublishBuildLook("build-1"), {
      wrapper: createQueryClientWrapper(),
    });

    await act(() => result.current.mutateAsync(festivalLook).catch(() => null));

    expect(trackEvent).not.toHaveBeenCalled();
  });
});
