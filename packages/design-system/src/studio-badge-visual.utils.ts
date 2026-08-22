import type { BadgeLayer } from "@outfiqe/types";
import type { CSSProperties } from "react";

import { BADGE_ICON_REFERENCE_SIZE_PX } from "./achievement-badge-icon.constants";

export const layerPositionStyle = (layer: BadgeLayer): CSSProperties => ({
  position: "absolute",
  left: `${layer.x}%`,
  top: `${layer.y}%`,
  width: `${layer.width}%`,
  height: `${layer.height}%`,
});

export const layerFontSizePx = (fontSize: number): number =>
  (fontSize / 100) * BADGE_ICON_REFERENCE_SIZE_PX;
