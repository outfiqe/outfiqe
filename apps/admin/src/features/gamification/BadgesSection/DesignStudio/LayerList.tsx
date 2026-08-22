import { cn } from "@outfiqe/design-system";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import type { BadgeLayer } from "../../schemas";
import { BADGE_LAYER_TYPE, LAYER_TYPE_LABEL } from "./studioLayer.constants";

const layerLabel = (layer: BadgeLayer): string => {
  if (layer.type === BADGE_LAYER_TYPE.TEXT) return layer.content || LAYER_TYPE_LABEL.text;
  if (layer.type === BADGE_LAYER_TYPE.ICON) return layer.glyph || LAYER_TYPE_LABEL.icon;
  return LAYER_TYPE_LABEL.background;
};

export const LayerList = ({
  layers,
  selectedLayerId,
  onSelectLayer,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  layers: BadgeLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string) => void;
  onMoveUp: (layerId: string) => void;
  onMoveDown: (layerId: string) => void;
  onRemove: (layerId: string) => void;
}) => (
  <ul className="space-y-1">
    {layers.length === 0 && (
      <li className="text-xs text-muted-foreground">No layers yet — add one below.</li>
    )}
    {layers.map((layer, index) => (
      <li
        key={layer.id}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs",
          layer.id === selectedLayerId ? "border-primary bg-muted" : "border-border",
        )}
      >
        <button
          type="button"
          onClick={() => onSelectLayer(layer.id)}
          className="min-w-0 flex-1 truncate text-left text-foreground"
        >
          {LAYER_TYPE_LABEL[layer.type]} — {layerLabel(layer)}
        </button>
        <button
          type="button"
          aria-label="Move layer up"
          disabled={index === layers.length - 1}
          onClick={() => onMoveUp(layer.id)}
          className="text-muted-foreground disabled:opacity-30"
        >
          <ArrowUp className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Move layer down"
          disabled={index === 0}
          onClick={() => onMoveDown(layer.id)}
          className="text-muted-foreground disabled:opacity-30"
        >
          <ArrowDown className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Remove layer"
          onClick={() => onRemove(layer.id)}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </button>
      </li>
    ))}
  </ul>
);
