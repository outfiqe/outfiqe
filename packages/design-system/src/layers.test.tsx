import { describe, expect, it } from "vitest";

import { layerDepth, OVERLAY_LAYER } from "./layers";

describe("OVERLAY_LAYER", () => {
  it("stacks every overlay that can open from the chat panel above it", () => {
    const drawerDepth = layerDepth(OVERLAY_LAYER.DRAWER);

    expect(layerDepth(OVERLAY_LAYER.MODAL)).toBeGreaterThan(drawerDepth);
    expect(layerDepth(OVERLAY_LAYER.FLOATING)).toBeGreaterThan(drawerDepth);
  });

  it("keeps popovers and tooltips above modals, toasts above both, and the tour on top", () => {
    expect(layerDepth(OVERLAY_LAYER.FLOATING)).toBeGreaterThan(layerDepth(OVERLAY_LAYER.MODAL));
    expect(layerDepth(OVERLAY_LAYER.TOAST)).toBeGreaterThan(layerDepth(OVERLAY_LAYER.FLOATING));
    expect(layerDepth(OVERLAY_LAYER.TOUR)).toBeGreaterThan(layerDepth(OVERLAY_LAYER.TOAST));
  });
});
