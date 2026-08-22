import type { BadgeLayer } from "@outfiqe/types";

import {
  LAYER_FONT_WEIGHT_CLASS,
  SHAPE_CLIP_PATH,
  SHIMMER_OVERLAY_STYLE,
} from "./achievement-badge-icon.constants";
import { cn } from "./cn";
import { layerFontSizePx, layerPositionStyle } from "./studio-badge-visual.utils";

export const StudioBadgeVisual = ({
  layers,
  isShimmering,
}: {
  layers: BadgeLayer[];
  isShimmering: boolean;
}) => (
  <div className="relative size-full">
    {layers.map((layer) => {
      if (layer.type === "background") {
        const clipPath = SHAPE_CLIP_PATH[layer.shape];
        return (
          <div
            key={layer.id}
            className={cn(!clipPath && "rounded-full")}
            style={{
              ...layerPositionStyle(layer),
              clipPath,
              backgroundColor: layer.fill,
              borderColor: layer.borderColor,
              borderWidth: layer.borderWidth ? `${layer.borderWidth}px` : undefined,
              borderStyle: layer.borderWidth ? "solid" : undefined,
              ...(isShimmering ? SHIMMER_OVERLAY_STYLE : undefined),
            }}
          />
        );
      }

      if (layer.type === "icon") {
        return (
          <div
            key={layer.id}
            className="flex items-center justify-center leading-none"
            style={{ ...layerPositionStyle(layer), fontSize: layerFontSizePx(layer.fontSize) }}
          >
            {layer.glyph}
          </div>
        );
      }

      return (
        <div
          key={layer.id}
          className={cn(
            "flex items-center justify-center text-center leading-none",
            LAYER_FONT_WEIGHT_CLASS[layer.fontWeight],
          )}
          style={{
            ...layerPositionStyle(layer),
            fontSize: layerFontSizePx(layer.fontSize),
            color: layer.color,
          }}
        >
          {layer.content}
        </div>
      );
    })}
  </div>
);
