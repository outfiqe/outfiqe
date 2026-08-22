export type BadgeCategory =
  "BEGINNER" | "CREATOR" | "COMMUNITY" | "ENGAGEMENT" | "COMMERCE" | "SPECIAL";

export type BadgeRarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY" | "EXCLUSIVE";

export type BadgeShape = "circle" | "shield" | "star" | "diamond" | "hexagon";

export type BadgeAnimation = "none" | "glow" | "shimmer" | "pulse" | "radiant";

export type BadgeLayerType = "background" | "icon" | "text";

type BadgeLayerBase = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BadgeBackgroundLayer = BadgeLayerBase & {
  type: "background";
  shape: BadgeShape;
  fill: string;
  borderColor?: string;
  borderWidth?: number;
};

export type BadgeIconLayer = BadgeLayerBase & {
  type: "icon";
  glyph: string;
  fontSize: number;
};

export type BadgeTextLayer = BadgeLayerBase & {
  type: "text";
  content: string;
  color: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
};

export type BadgeLayer = BadgeBackgroundLayer | BadgeIconLayer | BadgeTextLayer;

export type LegacyBadgeDesignConfig = {
  shape: BadgeShape;
  primaryColor: string;
  animation?: BadgeAnimation;
};

export type StudioBadgeDesignConfig = {
  version: 2;
  animation?: BadgeAnimation;
  layers: BadgeLayer[];
};

export type BadgeDesignConfig = LegacyBadgeDesignConfig | StudioBadgeDesignConfig;
