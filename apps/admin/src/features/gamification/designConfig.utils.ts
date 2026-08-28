import type { BadgeDesignConfig, BadgeLayer, BadgeShapeValue } from "./schemas";

const FALLBACK_SHAPE: BadgeShapeValue = "circle";
const FALLBACK_COLOR = "#94a3b8";

export const isStudioDesignConfig = (
  designConfig: BadgeDesignConfig,
): designConfig is Extract<BadgeDesignConfig, { layers: BadgeLayer[] }> => "layers" in designConfig;

export const legacyShapeAndColorOf = (
  designConfig: BadgeDesignConfig,
): { shape: BadgeShapeValue; primaryColor: string } =>
  isStudioDesignConfig(designConfig)
    ? { shape: FALLBACK_SHAPE, primaryColor: FALLBACK_COLOR }
    : { shape: designConfig.shape, primaryColor: designConfig.primaryColor };

export const studioLayersOf = (designConfig: BadgeDesignConfig): BadgeLayer[] =>
  isStudioDesignConfig(designConfig) ? designConfig.layers : [];

export const legacyImageUrlOf = (designConfig: BadgeDesignConfig): string =>
  isStudioDesignConfig(designConfig) ? "" : (designConfig.imageUrl ?? "");
