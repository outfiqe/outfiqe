import { Select } from "@outfiqe/design-system";

import type { BadgeImageFitValue } from "../../../api/gamificationSchemas";
import {
  IMAGE_FIT_OPTION_LABEL,
  IMAGE_FIT_OPTIONS,
} from "../../../constants/badgeOptions.constants";
import { BadgeIconUploader } from "../../components/BadgeIconUploader";
import type { BADGE_LAYER_TYPE } from "../constants/studioLayer.constants";
import type { LayerFieldsProps } from "../types/layerFields.types";
import { LayerNumberInput } from "./LayerNumberInput";

const MIN_LAYER_RADIUS = 0;
const MAX_LAYER_RADIUS = 100;

export const ImageLayerFields = ({
  layer,
  onChange,
}: LayerFieldsProps<typeof BADGE_LAYER_TYPE.IMAGE>) => {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <p className="block text-xs text-muted-foreground">Image</p>
        <BadgeIconUploader
          value={layer.url}
          onChange={(url) => onChange({ url })}
          onClear={() => onChange({ url: "" })}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="layer-image-fit" className="block text-xs text-muted-foreground">
          Fit
        </label>
        <Select
          id="layer-image-fit"
          value={layer.fit}
          onChange={(e) => onChange({ fit: e.target.value as BadgeImageFitValue })}
          className="w-36"
        >
          {IMAGE_FIT_OPTIONS.map((fit) => (
            <option key={fit} value={fit}>
              {IMAGE_FIT_OPTION_LABEL[fit]}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="layer-image-radius" className="block text-xs text-muted-foreground">
          Corner radius (%)
        </label>
        <LayerNumberInput
          id="layer-image-radius"
          min={MIN_LAYER_RADIUS}
          max={MAX_LAYER_RADIUS}
          value={layer.radius ?? MIN_LAYER_RADIUS}
          onCommit={(radius) => onChange({ radius })}
          className="w-20"
        />
      </div>
    </div>
  );
};
