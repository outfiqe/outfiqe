export const MAX_FEATURED_BADGES = 6;

export const MAX_BADGE_LAYERS = 12;

export const BADGE_LAYER_TYPE = {
  BACKGROUND: "background",
  ICON: "icon",
  TEXT: "text",
} as const;

export const BADGE_SHAPE = {
  CIRCLE: "circle",
  SHIELD: "shield",
  STAR: "star",
  DIAMOND: "diamond",
  HEXAGON: "hexagon",
} as const;

export const BADGE_ANIMATION = {
  NONE: "none",
  GLOW: "glow",
  SHIMMER: "shimmer",
  PULSE: "pulse",
  RADIANT: "radiant",
} as const;
