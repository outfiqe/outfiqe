import { AchievementBadgeIcon, Button, Input, Select } from "@outfiqe/design-system";
import { Circle, Image as ImageIcon, Sparkles, Type } from "lucide-react";
import { useState } from "react";

import {
  ANIMATION_OPTION_LABEL,
  ANIMATION_OPTIONS,
  AUTO_ANIMATION_OPTION,
  BADGE_DESIGN_MODE,
  DEFAULT_BADGE_ICON,
  SHAPE_OPTIONS,
} from "../../badgeOptions.constants";
import type { BadgeLayer, BadgeShapeValue } from "../../schemas";
import type { BadgeFormState } from "../badgeForm.types";
import { toPreviewDesignConfig } from "../badgeForm.utils";
import { BadgeIconUploader } from "../BadgeIconUploader";
import { DesignCanvas } from "./DesignCanvas";
import { LayerList } from "./LayerList";
import { LayerPropertiesPanel } from "./LayerPropertiesPanel";
import {
  createDefaultBackgroundLayer,
  createDefaultIconLayer,
  createDefaultImageLayer,
  createDefaultTextLayer,
  MAX_BADGE_LAYERS,
} from "./studioLayer.constants";
import { moveLayerDown, moveLayerUp } from "./studioLayer.utils";
import { StudioSection } from "./StudioSection";

const AnimationField = ({
  idPrefix,
  form,
  onChange,
}: {
  idPrefix: string;
  form: BadgeFormState;
  onChange: (form: BadgeFormState) => void;
}) => (
  <div className="space-y-1.5">
    <label htmlFor={`${idPrefix}-animation`} className="block text-xs text-muted-foreground">
      Animation
    </label>
    <Select
      id={`${idPrefix}-animation`}
      value={form.animation}
      onChange={(e) =>
        onChange({ ...form, animation: e.target.value as BadgeFormState["animation"] })
      }
      className="w-36"
    >
      <option value={AUTO_ANIMATION_OPTION}>Auto (by rarity)</option>
      {ANIMATION_OPTIONS.map((animation) => (
        <option key={animation} value={animation}>
          {ANIMATION_OPTION_LABEL[animation]}
        </option>
      ))}
    </Select>
  </div>
);

export const BadgeDesignSection = ({
  idPrefix,
  form,
  onChange,
}: {
  idPrefix: string;
  form: BadgeFormState;
  onChange: (form: BadgeFormState) => void;
}) => {
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    form.studioLayers[0]?.id ?? null,
  );

  const isStudio = form.designMode === BADGE_DESIGN_MODE.STUDIO;
  const layers = form.studioLayers;
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId) ?? null;
  const canAddLayer = layers.length < MAX_BADGE_LAYERS;

  const setLayers = (nextLayers: BadgeLayer[]) => onChange({ ...form, studioLayers: nextLayers });

  const updateLayer = (layerId: string, updates: Partial<BadgeLayer>) =>
    setLayers(
      layers.map((layer) =>
        layer.id === layerId ? ({ ...layer, ...updates } as BadgeLayer) : layer,
      ),
    );

  const addLayer = (layer: BadgeLayer) => {
    setLayers([...layers, layer]);
    setSelectedLayerId(layer.id);
  };

  const removeLayer = (layerId: string) => {
    setLayers(layers.filter((layer) => layer.id !== layerId));
    if (selectedLayerId === layerId) setSelectedLayerId(null);
  };

  const switchToStudio = () => {
    const seededLayers = layers.length > 0 ? layers : [createDefaultBackgroundLayer()];
    onChange({ ...form, designMode: BADGE_DESIGN_MODE.STUDIO, studioLayers: seededLayers });
    setSelectedLayerId(seededLayers[0]?.id ?? null);
  };

  const switchToSimple = () =>
    onChange({ ...form, designMode: BADGE_DESIGN_MODE.SIMPLE, studioLayers: [] });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Design mode</span>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={isStudio ? "outline" : "default"}
            onClick={switchToSimple}
          >
            Simple
          </Button>
          <Button
            type="button"
            size="sm"
            variant={isStudio ? "default" : "outline"}
            onClick={switchToStudio}
          >
            Studio (layers)
          </Button>
        </div>
      </div>

      {isStudio ? (
        <div className="grid gap-6 lg:grid-cols-[352px_minmax(0,1fr)_260px]">
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
              <p className="text-xs text-muted-foreground">
                {layers.length} / {MAX_BADGE_LAYERS} layers
              </p>
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canAddLayer}
                  onClick={() => addLayer(createDefaultImageLayer())}
                >
                  <ImageIcon className="size-3.5" />
                  Image
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
                onMoveUp={(layerId) => setLayers(moveLayerUp(layers, layerId))}
                onMoveDown={(layerId) => setLayers(moveLayerDown(layers, layerId))}
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
              <AnimationField idPrefix={idPrefix} form={form} onChange={onChange} />
            </StudioSection>
            <StudioSection title="Live preview" hint="Exactly how this badge appears on the site.">
              <div className="flex justify-center py-2">
                <AchievementBadgeIcon
                  icon={form.icon || DEFAULT_BADGE_ICON}
                  designConfig={toPreviewDesignConfig(form)}
                  rarity={form.rarity}
                  isLocked={false}
                />
              </div>
            </StudioSection>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_200px]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor={`${idPrefix}-shape`}
                  className="block text-xs text-muted-foreground"
                >
                  Shape
                </label>
                <Select
                  id={`${idPrefix}-shape`}
                  value={form.shape}
                  onChange={(e) => onChange({ ...form, shape: e.target.value as BadgeShapeValue })}
                  className="w-32"
                >
                  {SHAPE_OPTIONS.map((shape) => (
                    <option key={shape} value={shape}>
                      {shape}
                    </option>
                  ))}
                </Select>
              </div>
              {!form.iconImageUrl && (
                <div className="space-y-1.5">
                  <label
                    htmlFor={`${idPrefix}-color`}
                    className="block text-xs text-muted-foreground"
                  >
                    Color
                  </label>
                  <Input
                    id={`${idPrefix}-color`}
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) => onChange({ ...form, primaryColor: e.target.value })}
                    className="h-11 w-16 p-1"
                  />
                </div>
              )}
              <AnimationField idPrefix={idPrefix} form={form} onChange={onChange} />
            </div>

            <div className="space-y-1.5">
              <p className="block text-xs text-muted-foreground">
                Custom image (optional — replaces the emoji, clipped to the shape)
              </p>
              <BadgeIconUploader
                value={form.iconImageUrl}
                onChange={(url) => onChange({ ...form, iconImageUrl: url })}
                onClear={() => onChange({ ...form, iconImageUrl: "" })}
                shapeClassName={form.shape === "circle" ? "rounded-full" : "rounded-lg"}
              />
            </div>
          </div>

          <StudioSection title="Live preview" hint="Exactly how this badge appears on the site.">
            <div className="flex justify-center py-2">
              <AchievementBadgeIcon
                icon={form.icon || DEFAULT_BADGE_ICON}
                designConfig={toPreviewDesignConfig(form)}
                rarity={form.rarity}
                isLocked={false}
              />
            </div>
          </StudioSection>
        </div>
      )}
    </div>
  );
};
