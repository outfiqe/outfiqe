import type { BadgeLayer } from "../../../api/gamificationSchemas";

export type LayerFieldsProps<LayerType extends BadgeLayer["type"]> = {
  layer: Extract<BadgeLayer, { type: LayerType }>;
  onChange: (updates: Partial<BadgeLayer>) => void;
};
