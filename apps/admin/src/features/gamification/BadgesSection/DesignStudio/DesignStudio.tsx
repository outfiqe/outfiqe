import { AchievementBadgeIcon, Button, Modal, Select } from "@outfiqe/design-system";
import { useState } from "react";

import {
  ANIMATION_OPTION_LABEL,
  ANIMATION_OPTIONS,
  AUTO_ANIMATION_OPTION,
} from "../../badgeOptions.constants";
import type { BadgeAnimationValue, BadgeLayer, BadgeRarityValue } from "../../schemas";
import { DesignCanvas } from "./DesignCanvas";
import { LayerList } from "./LayerList";
import { LayerPropertiesPanel } from "./LayerPropertiesPanel";
import {
  createDefaultBackgroundLayer,
  createDefaultIconLayer,
  createDefaultTextLayer,
  DEFAULT_BACKGROUND_SHAPE,
  DEFAULT_LAYER_FILL_COLOR,
  MAX_BADGE_LAYERS,
} from "./studioLayer.constants";
import { moveLayerDown, moveLayerUp } from "./studioLayer.utils";

type DesignStudioProps = {
  icon: string;
  rarity: BadgeRarityValue;
  initialLayers: BadgeLayer[];
  initialAnimation: BadgeAnimationValue | typeof AUTO_ANIMATION_OPTION;
  onDone: (
    layers: BadgeLayer[],
    animation: BadgeAnimationValue | typeof AUTO_ANIMATION_OPTION,
  ) => void;
  onCancel: () => void;
};

export const DesignStudio = ({
  icon,
  rarity,
  initialLayers,
  initialAnimation,
  onDone,
  onCancel,
}: DesignStudioProps) => {
  const [layers, setLayers] = useState<BadgeLayer[]>(
    initialLayers.length > 0 ? initialLayers : [createDefaultBackgroundLayer()],
  );
  const [animation, setAnimation] = useState(initialAnimation);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    (initialLayers[0] ?? layers[0])?.id ?? null,
  );

  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId) ?? null;

  const updateLayer = (layerId: string, updates: Partial<BadgeLayer>) => {
    setLayers((current) =>
      current.map((layer) =>
        layer.id === layerId ? ({ ...layer, ...updates } as BadgeLayer) : layer,
      ),
    );
  };

  const addLayer = (layer: BadgeLayer) => {
    setLayers((current) => [...current, layer]);
    setSelectedLayerId(layer.id);
  };

  const removeLayer = (layerId: string) => {
    setLayers((current) => current.filter((layer) => layer.id !== layerId));
    setSelectedLayerId((current) => (current === layerId ? null : current));
  };

  const previewDesignConfig =
    layers.length > 0
      ? {
          version: 2 as const,
          layers,
          ...(animation === AUTO_ANIMATION_OPTION ? {} : { animation }),
        }
      : { shape: DEFAULT_BACKGROUND_SHAPE, primaryColor: DEFAULT_LAYER_FILL_COLOR };

  return (
    <Modal open onClose={onCancel} title="Design Studio">
      <div className="flex flex-wrap gap-6">
        <div className="space-y-3">
          <DesignCanvas
            layers={layers}
            selectedLayerId={selectedLayerId}
            onSelectLayer={setSelectedLayerId}
            onChangeLayer={updateLayer}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={layers.length >= MAX_BADGE_LAYERS}
              onClick={() => addLayer(createDefaultBackgroundLayer())}
            >
              Add background
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={layers.length >= MAX_BADGE_LAYERS}
              onClick={() => addLayer(createDefaultIconLayer())}
            >
              Add icon
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={layers.length >= MAX_BADGE_LAYERS}
              onClick={() => addLayer(createDefaultTextLayer())}
            >
              Add text
            </Button>
          </div>
        </div>

        <div className="min-w-56 flex-1 space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Layers</p>
            <LayerList
              layers={layers}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
              onMoveUp={(layerId) => setLayers((current) => moveLayerUp(current, layerId))}
              onMoveDown={(layerId) => setLayers((current) => moveLayerDown(current, layerId))}
              onRemove={removeLayer}
            />
          </div>

          {selectedLayer && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Selected layer</p>
              <LayerPropertiesPanel
                layer={selectedLayer}
                onChange={(updates) => updateLayer(selectedLayer.id, updates)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="studio-animation" className="block text-xs text-muted-foreground">
              Animation
            </label>
            <Select
              id="studio-animation"
              value={animation}
              onChange={(e) =>
                setAnimation(e.target.value as BadgeAnimationValue | typeof AUTO_ANIMATION_OPTION)
              }
              className="w-36"
            >
              <option value={AUTO_ANIMATION_OPTION}>Auto (by rarity)</option>
              {ANIMATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {ANIMATION_OPTION_LABEL[option]}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Live preview</p>
            <AchievementBadgeIcon
              icon={icon}
              designConfig={previewDesignConfig}
              rarity={rarity}
              isLocked={false}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => onDone(layers, animation)}
              disabled={layers.length === 0}
            >
              Done
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
