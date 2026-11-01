import { Checkbox, Input } from "@outfiqe/design-system";

import type { BADGE_LAYER_TYPE } from "../constants/studioLayer.constants";
import {
  BADGE_FONT_WEIGHT,
  MAX_LAYER_FONT_SIZE,
  MIN_LAYER_FONT_SIZE,
} from "../constants/studioLayer.constants";
import type { LayerFieldsProps } from "../types/layerFields.types";
import { LayerNumberInput } from "./LayerNumberInput";

export const TextLayerFields = ({
  layer,
  onChange,
}: LayerFieldsProps<typeof BADGE_LAYER_TYPE.TEXT>) => {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="layer-content" className="block text-xs text-muted-foreground">
          Text
        </label>
        <Input
          id="layer-content"
          value={layer.content}
          onChange={(e) => onChange({ content: e.target.value })}
        />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="layer-color" className="block text-xs text-muted-foreground">
            Color
          </label>
          <Input
            id="layer-color"
            type="color"
            value={layer.color}
            onChange={(e) => onChange({ color: e.target.value })}
            className="h-11 w-16 p-1"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="layer-text-size" className="block text-xs text-muted-foreground">
            Size (% of badge)
          </label>
          <LayerNumberInput
            id="layer-text-size"
            min={MIN_LAYER_FONT_SIZE}
            max={MAX_LAYER_FONT_SIZE}
            value={layer.fontSize}
            onCommit={(fontSize) => onChange({ fontSize })}
            className="w-20"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox
            checked={layer.fontWeight === BADGE_FONT_WEIGHT.BOLD}
            onChange={(e) =>
              onChange({
                fontWeight: e.target.checked ? BADGE_FONT_WEIGHT.BOLD : BADGE_FONT_WEIGHT.NORMAL,
              })
            }
          />
          Bold
        </label>
      </div>
    </div>
  );
};
