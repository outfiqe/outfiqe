import { Checkbox, Input, Select } from "@outfiqe/design-system";

import {
  IMAGE_FIT_OPTION_LABEL,
  IMAGE_FIT_OPTIONS,
  SHAPE_OPTIONS,
} from "../../badgeOptions.constants";
import type { BadgeImageFitValue, BadgeLayer, BadgeShapeValue } from "../../schemas";
import { BadgeIconUploader } from "../BadgeIconUploader";
import {
  BADGE_FONT_WEIGHT,
  BADGE_LAYER_TYPE,
  MAX_LAYER_BORDER_WIDTH,
  MAX_LAYER_FONT_SIZE,
  MIN_LAYER_BORDER_WIDTH,
  MIN_LAYER_FONT_SIZE,
} from "./studioLayer.constants";

const DEFAULT_BORDER_COLOR = "#000000";
const DEFAULT_BORDER_WIDTH_PX = 2;
const NO_BORDER_WIDTH_PX = 0;
const MIN_LAYER_RADIUS = 0;
const MAX_LAYER_RADIUS = 100;

export const LayerPropertiesPanel = ({
  layer,
  onChange,
}: {
  layer: BadgeLayer;
  onChange: (updates: Partial<BadgeLayer>) => void;
}) => {
  if (layer.type === BADGE_LAYER_TYPE.BACKGROUND) {
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
              <Input
                id="layer-border-width"
                type="number"
                min={MIN_LAYER_BORDER_WIDTH}
                max={MAX_LAYER_BORDER_WIDTH}
                value={layer.borderWidth ?? NO_BORDER_WIDTH_PX}
                onChange={(e) => onChange({ borderWidth: Number(e.target.value) })}
                className="w-20"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (layer.type === BADGE_LAYER_TYPE.ICON) {
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
          <Input
            id="layer-icon-size"
            type="number"
            min={MIN_LAYER_FONT_SIZE}
            max={MAX_LAYER_FONT_SIZE}
            value={layer.fontSize}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
            className="w-20"
          />
        </div>
      </div>
    );
  }

  if (layer.type === BADGE_LAYER_TYPE.IMAGE) {
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
          <Input
            id="layer-image-radius"
            type="number"
            min={MIN_LAYER_RADIUS}
            max={MAX_LAYER_RADIUS}
            value={layer.radius ?? MIN_LAYER_RADIUS}
            onChange={(e) => onChange({ radius: Number(e.target.value) })}
            className="w-20"
          />
        </div>
      </div>
    );
  }

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
          <Input
            id="layer-text-size"
            type="number"
            min={MIN_LAYER_FONT_SIZE}
            max={MAX_LAYER_FONT_SIZE}
            value={layer.fontSize}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
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
