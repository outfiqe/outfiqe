import { Input } from "@outfiqe/design-system";

import type { BADGE_LAYER_TYPE } from "../constants/studioLayer.constants";
import { MAX_LAYER_FONT_SIZE, MIN_LAYER_FONT_SIZE } from "../constants/studioLayer.constants";
import type { LayerFieldsProps } from "../types/layerFields.types";
import { LayerNumberInput } from "./LayerNumberInput";

export const IconLayerFields = ({
  layer,
  onChange,
}: LayerFieldsProps<typeof BADGE_LAYER_TYPE.ICON>) => {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="layer-glyph" className="block text-xs text-muted-foreground">
          Icon (emoji)
        </label>
        <Input
          id="layer-glyph"
          value={layer.glyph}
          onChange={(e) => onChange({ glyph: e.target.value })}
          className="w-20"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="layer-icon-size" className="block text-xs text-muted-foreground">
          Size (% of badge)
        </label>
        <LayerNumberInput
          id="layer-icon-size"
          min={MIN_LAYER_FONT_SIZE}
          max={MAX_LAYER_FONT_SIZE}
          value={layer.fontSize}
          onCommit={(fontSize) => onChange({ fontSize })}
          className="w-20"
        />
      </div>
    </div>
  );
};
