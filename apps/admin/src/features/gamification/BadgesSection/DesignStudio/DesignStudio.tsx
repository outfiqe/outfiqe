import { AchievementBadgeIcon, Button, Modal, Select } from "@outfiqe/design-system";
import { Circle, Sparkles, Type } from "lucide-react";
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
import { StudioSection } from "./StudioSection";

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
  const canAddLayer = layers.length < MAX_BADGE_LAYERS;

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
    <Modal
      open
      onClose={onCancel}
      title="Design Studio"
      description="Drag a layer to move it, or use the corner handles to resize it."
      className="sm:max-w-5xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {layers.length} / {MAX_BADGE_LAYERS} layers
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => onDone(layers, animation)}
              disabled={layers.length === 0}
            >
              Done
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)_240px]">
        <StudioSection
          title="Canvas"
          hint="Click a layer to select it, then drag or resize it with the handles."
        >
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
                disabled={!canAddLayer}
                onClick={() => addLayer(createDefaultBackgroundLayer())}
              >
                <Circle className="size-3.5" />
                Background
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canAddLayer}
                onClick={() => addLayer(createDefaultIconLayer())}
              >
                <Sparkles className="size-3.5" />
                Icon
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canAddLayer}
                onClick={() => addLayer(createDefaultTextLayer())}
              >
                <Type className="size-3.5" />
                Text
              </Button>
            </div>
          </div>
        </StudioSection>

        <div className="space-y-4">
          <StudioSection title="Layers">
            <LayerList
              layers={layers}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
              onMoveUp={(layerId) => setLayers((current) => moveLayerUp(current, layerId))}
              onMoveDown={(layerId) => setLayers((current) => moveLayerDown(current, layerId))}
              onRemove={removeLayer}
            />
          </StudioSection>

          {selectedLayer && (
            <StudioSection title="Layer properties">
              <LayerPropertiesPanel
                layer={selectedLayer}
                onChange={(updates) => updateLayer(selectedLayer.id, updates)}
              />
            </StudioSection>
          )}
        </div>

        <div className="space-y-4">
          <StudioSection title="Animation">
            <label htmlFor="studio-animation" className="sr-only">
              Animation
            </label>
            <Select
              id="studio-animation"
              value={animation}
              onChange={(e) =>
                setAnimation(e.target.value as BadgeAnimationValue | typeof AUTO_ANIMATION_OPTION)
              }
              className="w-full"
            >
              <option value={AUTO_ANIMATION_OPTION}>Auto (by rarity)</option>
              {ANIMATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {ANIMATION_OPTION_LABEL[option]}
                </option>
              ))}
            </Select>
          </StudioSection>

          <StudioSection title="Live preview" hint="Exactly how this badge appears on the site.">
            <div className="flex justify-center py-2">
              <AchievementBadgeIcon
                icon={icon}
                designConfig={previewDesignConfig}
                rarity={rarity}
                isLocked={false}
              />
            </div>
          </StudioSection>
        </div>
      </div>
    </Modal>
  );
};
