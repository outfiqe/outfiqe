import { Checkbox, Input, Select } from "@outfiqe/design-system";

import type { BadgeShapeValue } from "../../../api/gamificationSchemas";
import { SHAPE_OPTIONS } from "../../../constants/badgeOptions.constants";
import type { BADGE_LAYER_TYPE } from "../constants/studioLayer.constants";
import { MAX_LAYER_BORDER_WIDTH } from "../constants/studioLayer.constants";
import type { LayerFieldsProps } from "../types/layerFields.types";
import { LayerNumberInput } from "./LayerNumberInput";

const DEFAULT_BORDER_COLOR = "#000000";
const DEFAULT_BORDER_WIDTH_PX = 2;
const MIN_ENABLED_BORDER_WIDTH_PX = 1;

export const BackgroundLayerFields = ({
  layer,
  onChange,
}: LayerFieldsProps<typeof BADGE_LAYER_TYPE.BACKGROUND>) => {
  const hasBorder = Boolean(layer.borderWidth);
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="layer-shape" className="block text-xs text-muted-foreground">
          Shape
        </label>
        <Select
          id="layer-shape"
          value={layer.shape}
          onChange={(e) => onChange({ shape: e.target.value as BadgeShapeValue })}
          className="w-32"
        >
          {SHAPE_OPTIONS.map((shape) => (
            <option key={shape} value={shape}>
              {shape}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="layer-fill" className="block text-xs text-muted-foreground">
          Fill color
        </label>
        <Input
          id="layer-fill"
          type="color"
          value={layer.fill}
          onChange={(e) => onChange({ fill: e.target.value })}
          className="h-11 w-16 p-1"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <Checkbox
          checked={hasBorder}
          onChange={(e) =>
            onChange(
              e.target.checked
                ? {
                    borderWidth: DEFAULT_BORDER_WIDTH_PX,
                    borderColor: layer.borderColor ?? DEFAULT_BORDER_COLOR,
                  }
                : { borderWidth: undefined, borderColor: undefined },
            )
          }
        />
        Border
      </label>
      {hasBorder && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label htmlFor="layer-border-color" className="block text-xs text-muted-foreground">
              Border color
            </label>
            <Input
              id="layer-border-color"
              type="color"
              value={layer.borderColor ?? DEFAULT_BORDER_COLOR}
              onChange={(e) => onChange({ borderColor: e.target.value })}
              className="h-11 w-16 p-1"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="layer-border-width" className="block text-xs text-muted-foreground">
              Border width (px)
            </label>
            <LayerNumberInput
              id="layer-border-width"
              min={MIN_ENABLED_BORDER_WIDTH_PX}
              max={MAX_LAYER_BORDER_WIDTH}
              value={layer.borderWidth ?? DEFAULT_BORDER_WIDTH_PX}
              onCommit={(borderWidth) => onChange({ borderWidth })}
              className="w-20"
            />
          </div>
        </div>
      )}
    </div>
  );
};
