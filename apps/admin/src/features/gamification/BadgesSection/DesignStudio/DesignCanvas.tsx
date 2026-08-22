import { cn, SHAPE_CLIP_PATH } from "@outfiqe/design-system";
import { Rnd } from "react-rnd";

import type { BadgeLayer } from "../../schemas";
import { BADGE_FONT_WEIGHT, BADGE_LAYER_TYPE, CANVAS_SIZE_PX } from "./studioLayer.constants";
import { percentToPx, pxToPercent } from "./studioLayer.utils";

const CHECKERBOARD_STYLE = {
  backgroundImage:
    "linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
};

const layerContentClassName = (layer: BadgeLayer): string =>
  layer.type === BADGE_LAYER_TYPE.BACKGROUND
    ? "size-full"
    : "flex size-full items-center justify-center overflow-hidden text-center leading-none";

const LayerContent = ({ layer }: { layer: BadgeLayer }) => {
  if (layer.type === BADGE_LAYER_TYPE.BACKGROUND) {
    const clipPath = SHAPE_CLIP_PATH[layer.shape];
    return (
      <div
        className={!clipPath ? "size-full rounded-full" : "size-full"}
        style={{
          clipPath,
          backgroundColor: layer.fill,
          borderColor: layer.borderColor,
          borderWidth: layer.borderWidth ? `${layer.borderWidth}px` : undefined,
          borderStyle: layer.borderWidth ? "solid" : undefined,
        }}
      />
    );
  }

  if (layer.type === BADGE_LAYER_TYPE.ICON) {
    return <span style={{ fontSize: `${layer.fontSize}%` }}>{layer.glyph}</span>;
  }

  return (
    <span
      className={layer.fontWeight === BADGE_FONT_WEIGHT.BOLD ? "font-bold" : "font-normal"}
      style={{ fontSize: `${layer.fontSize}%`, color: layer.color }}
    >
      {layer.content}
    </span>
  );
};

export const DesignCanvas = ({
  layers,
  selectedLayerId,
  onSelectLayer,
  onChangeLayer,
}: {
  layers: BadgeLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string) => void;
  onChangeLayer: (layerId: string, updates: Partial<BadgeLayer>) => void;
}) => (
  <div
    className="relative overflow-hidden rounded-xl border border-border"
    style={{ width: CANVAS_SIZE_PX, height: CANVAS_SIZE_PX, ...CHECKERBOARD_STYLE }}
  >
    {layers.map((layer) => (
      <Rnd
        key={layer.id}
        bounds="parent"
        size={{ width: percentToPx(layer.width), height: percentToPx(layer.height) }}
        position={{ x: percentToPx(layer.x), y: percentToPx(layer.y) }}
        onDragStart={() => onSelectLayer(layer.id)}
        onDragStop={(_event, data) =>
          onChangeLayer(layer.id, { x: pxToPercent(data.x), y: pxToPercent(data.y) })
        }
        onResizeStart={() => onSelectLayer(layer.id)}
        onResizeStop={(_event, _direction, ref, _delta, position) =>
          onChangeLayer(layer.id, {
            width: pxToPercent(ref.offsetWidth),
            height: pxToPercent(ref.offsetHeight),
            x: pxToPercent(position.x),
            y: pxToPercent(position.y),
          })
        }
        className={cn(layer.id === selectedLayerId && "outline outline-2 outline-primary")}
      >
        <div className={layerContentClassName(layer)} onMouseDown={() => onSelectLayer(layer.id)}>
          <LayerContent layer={layer} />
        </div>
      </Rnd>
    ))}
  </div>
);
