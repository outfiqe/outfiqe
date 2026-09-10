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

export const layerFontSizePx = (
  fontSizePercentOfBadge: number,
  badgeSizePx: number = BADGE_ICON_REFERENCE_SIZE_PX,
): number => (fontSizePercentOfBadge / 100) * badgeSizePx;

export const layerBorderWidthPx = (
  borderWidthAtReferenceSize: number,
  badgeSizePx: number = BADGE_ICON_REFERENCE_SIZE_PX,
): number => (borderWidthAtReferenceSize / BADGE_ICON_REFERENCE_SIZE_PX) * badgeSizePx;
