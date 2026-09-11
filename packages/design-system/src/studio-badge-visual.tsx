import type { BadgeLayer } from "@outfiqe/types";
import type { CSSProperties } from "react";

import {
  LAYER_FONT_WEIGHT_CLASS,
  SHAPE_CLIP_PATH,
  SHIMMER_OVERLAY_STYLE,
} from "./achievement-badge-icon.constants";
import { cn } from "./cn";
import {
  layerBorderWidthPx,
  layerFontSizePx,
  layerPositionStyle,
} from "./studio-badge-visual.utils";

export const StudioBadgeVisual = ({
  layers,
  isShimmering,
}: {
  layers: BadgeLayer[];
  isShimmering: boolean;
}) => {
  const backgroundLayer = layers.find((layer) => layer.type === "background");
  const backgroundClipPath = backgroundLayer ? SHAPE_CLIP_PATH[backgroundLayer.shape] : undefined;
  const shimmerStyle: CSSProperties | undefined = isShimmering
    ? {
        ...(backgroundLayer
          ? { ...layerPositionStyle(backgroundLayer), clipPath: backgroundClipPath }
          : { position: "absolute", inset: 0 }),
        ...SHIMMER_OVERLAY_STYLE,
      }
    : undefined;

  return (
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
                borderWidth: layer.borderWidth
                  ? `${layerBorderWidthPx(layer.borderWidth)}px`
                  : undefined,
                borderStyle: layer.borderWidth ? "solid" : undefined,
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

        if (layer.type === "image") {
          return (
            <div
              key={layer.id}
              style={{
                ...layerPositionStyle(layer),
                backgroundImage: `url(${layer.url})`,
                backgroundSize: layer.fit,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                borderRadius: layer.radius ? `${layer.radius}%` : undefined,
              }}
            />
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
      {isShimmering && (
        <span
          aria-hidden
          className={cn(
            "animate-badge-shimmer pointer-events-none",
            backgroundLayer && !backgroundClipPath && "rounded-full",
          )}
          style={shimmerStyle}
        />
      )}
    </div>
  );
};
