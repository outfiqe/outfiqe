import type { BadgeLayer } from "../../../api/gamificationSchemas";
import { BADGE_LAYER_TYPE } from "../constants/studioLayer.constants";
import { BackgroundLayerFields } from "./BackgroundLayerFields";
import { IconLayerFields } from "./IconLayerFields";
import { ImageLayerFields } from "./ImageLayerFields";
import { TextLayerFields } from "./TextLayerFields";

export const LayerPropertiesPanel = ({
  layer,
  onChange,
}: {
  layer: BadgeLayer;
  onChange: (updates: Partial<BadgeLayer>) => void;
}) => {
  if (layer.type === BADGE_LAYER_TYPE.BACKGROUND) {
    return <BackgroundLayerFields layer={layer} onChange={onChange} />;
  }
  if (layer.type === BADGE_LAYER_TYPE.ICON) {
    return <IconLayerFields layer={layer} onChange={onChange} />;
  }
  if (layer.type === BADGE_LAYER_TYPE.IMAGE) {
    return <ImageLayerFields layer={layer} onChange={onChange} />;
  }
  return <TextLayerFields layer={layer} onChange={onChange} />;
};
