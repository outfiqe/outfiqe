export const OVERLAY_LAYER = {
  DRAWER: "z-[60]",
  MODAL: "z-[70]",
  FLOATING: "z-[80]",
  TOAST: "z-[90]",
  TOUR: "z-[100]",
} as const;

export type OverlayLayer = (typeof OVERLAY_LAYER)[keyof typeof OVERLAY_LAYER];

const LAYER_DEPTH_PATTERN = /^z-\[(\d+)\]$/;

export const layerDepth = (layer: OverlayLayer): number =>
  Number(LAYER_DEPTH_PATTERN.exec(layer)?.[1]);
