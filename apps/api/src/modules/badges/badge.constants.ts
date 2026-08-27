export const MAX_FEATURED_BADGES = 6;

export const MAX_BADGE_LAYERS = 12;

export const BADGE_LAYER_TYPE = {
  BACKGROUND: "background",
  ICON: "icon",
  TEXT: "text",
  IMAGE: "image",
} as const;

export const BADGE_IMAGE_FIT = {
  CONTAIN: "contain",
  COVER: "cover",
} as const;

export const ICON_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const MAX_ICON_IMAGE_BYTES = 2 * 1024 * 1024;
export const ICON_IMAGE_EDGE_PX = 256;

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
